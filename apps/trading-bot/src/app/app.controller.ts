import { Body, Controller, Post, Query } from "@nestjs/common";
import { TradingViewAction, TradingViewMessage } from "@trading-bot/types";
import { AppService } from "./app.service";
import { SymbolMarketLotSizeFilter } from "binance";

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
      const minMaxFilter: SymbolMarketLotSizeFilter | undefined = symbolInfo.filters.find((f) => f.filterType === "MARKET_LOT_SIZE") as SymbolMarketLotSizeFilter | undefined;
      if (!symbolInfo || !accountSize || !minMaxFilter) return;

      const availableBalance = Number.parseFloat(accountSize.availableBalance.toString());
      const allowedLoss = availableBalance * 0.01;
      const priceStep = 1 / Math.pow(10, symbolInfo.pricePrecision);
      const entryPrice = Number.parseFloat(body.close) + (body.strategy_order_action === TradingViewAction.Buy ? -priceStep : priceStep);
      const stopLossPrice = body.strategy_order_action === TradingViewAction.Buy ? Math.min(entryPrice, Number.parseFloat(body.low)) : Math.max(entryPrice, Number.parseFloat(body.high));

      const slPoints = Math.ceil(Math.abs(entryPrice - stopLossPrice) / priceStep);
      const tpPoints = slPoints * 5;

      const quantity = body.strategy_order_action === TradingViewAction.Buy ? this.appService.targetBuyPositionSize(entryPrice, stopLossPrice, allowedLoss) : this.appService.targetSellPositionSize(entryPrice, stopLossPrice, allowedLoss);
      const minQty = Math.max(Number.parseFloat(minMaxFilter.minQty.toString()), Math.ceil(5 / Number.parseFloat(body.close)));
      const quantityDivisor = Math.pow(10, symbolInfo.quantityPrecision);
      const quantityRounded = Math.max(minQty, Math.floor(quantity * quantityDivisor) / quantityDivisor);
      const tpPrice = entryPrice + (body.strategy_order_action === TradingViewAction.Buy ? tpPoints * priceStep : -tpPoints * priceStep);

      this.appService
        .createStopLimit({
          symbol,
          orderSide: body.strategy_order_action === TradingViewAction.Buy ? "BUY" : "SELL",
          price: entryPrice,
          takeProfitPrice: tpPrice,
          stopLossPrice: stopLossPrice,
          quantity: quantityRounded,
          pricePrecision: symbolInfo.pricePrecision,
          quantityPrecision: symbolInfo.quantityPrecision,
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

  @Post("close")
  public closePosition(@Query("accountId") accountId: string, @Body() body: TradingViewMessage): void {
    const symbol = body.ticker.replace("PERP", "");
    const closeOpenedPositions$ = this.appService.closePositionForSymbolOrder(symbol);
    const cancelAllOpenOrdersForSymbol$ = this.appService.cancelAllOpenedOrders(symbol);
    Promise.all([cancelAllOpenOrdersForSymbol$, closeOpenedPositions$]).then(
      (result) => {
        console.log("result", result);
      },
      (e) => {
        console.log("exception", e);
      }
    );
  }
}
