import { Body, Controller, Post, Query } from "@nestjs/common";
import { TradingViewAction, TradingViewMessage } from "@trading-bot/types";
import { AppService } from "./app.service";

@Controller("orders")
export class AppController {
  constructor(private appService: AppService) {}

  @Post("create")
  public executeOrder(@Query("accountId") accountId: string, @Body() body: TradingViewMessage): void {
    const symbol = body.ticker.replace("PERP", "");
    const symbolInfo$ = this.appService.getSymbolInfo(symbol);
    const accountSize$ = this.appService.getAccountBalance();
    const closeOpenedPositions$ = this.appService.closePositionForSymbolOrder(symbol);
    const cancelAllOpenOrdersForSymbol$ = this.appService.cancelAllOpenedOrders(symbol);

    Promise.all([symbolInfo$, accountSize$, closeOpenedPositions$, cancelAllOpenOrdersForSymbol$]).then(([symbolInfo, accountSize]) => {
      if (!symbolInfo || !accountSize) return;

      const availableBalance = Number.parseFloat(accountSize.availableBalance.toString());
      const allowedLoss = availableBalance * 0.01;
      const pricePostOnlyCorrection = 2 / Math.pow(10, symbolInfo.pricePrecision);
      const entryPrice = Number.parseFloat(body.close) + (body.strategy_order_action === TradingViewAction.Buy ? -pricePostOnlyCorrection : pricePostOnlyCorrection);
      const quantity =
        body.strategy_order_action === TradingViewAction.Buy
          ? this.appService.targetBuyPositionSize(entryPrice, Math.min(entryPrice, Number.parseFloat(body.low)), allowedLoss)
          : this.appService.targetSellPositionSize(entryPrice, Math.max(entryPrice, Number.parseFloat(body.high)), allowedLoss);
      const quantityDivisor = Math.pow(10, symbolInfo.quantityPrecision);
      const quantityRounded = Math.floor(quantity * quantityDivisor) / quantityDivisor;

      this.appService
        .createStopLimit({
          symbol,
          orderSide: body.strategy_order_action === TradingViewAction.Buy ? "BUY" : "SELL",
          price: entryPrice,
          quantity: quantityRounded,
          stopLoss: Number.parseFloat(body.strategy_order_action === TradingViewAction.Buy ? body.low : body.high),
        })
        .then(
          (result) => {
            console.log("result", result);
          },
          (e) => {
            console.log("exception", e);
          }
        );
    });
  }
}
