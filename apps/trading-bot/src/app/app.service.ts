import { Injectable } from "@nestjs/common";
import { TradingViewMarketPosition, TradingViewMessage } from "@trading-bot/types";
import { FuturesPosition, NewOrderError, NewOrderResult, USDMClient } from "binance";

export interface OrderParams {
  client: USDMClient;
  positionSizeRatio: number;
  message: TradingViewMessage;
}

export interface Response {
  closedPosition: NewOrderResult | NewOrderError | undefined;
  newPosition: NewOrderResult | NewOrderError;
}

@Injectable()
export class AppService {
  public async executeOrder({ client, positionSizeRatio, message }: OrderParams): Promise<Response> {
    const symbol = message.ticker.replace("PERP", "");
    const availableBalance = await this.#getUsdtBalance(client);

    // Close all orders
    const positions = await client.getPositions();
    const position = positions.find((p) => p.symbol === symbol);
    const leverage = Number.parseFloat(position.leverage.toString());

    let closedPosition: NewOrderResult | NewOrderError | undefined;
    try {
      closedPosition = await this.#closeExistingOffer(client, position);
    } catch (e) {
      closedPosition = undefined;
    }

    let newPosition: NewOrderResult | NewOrderError;
    try {
      newPosition = await client.submitNewOrder({
        symbol,
        side: message.strategy_market_position === TradingViewMarketPosition.Long ? "BUY" : "SELL",
        type: "MARKET",
        quantity: Math.floor((availableBalance * positionSizeRatio * leverage) / Number.parseFloat(message.close))
      });
    } catch (e) {
      newPosition = e;
    }

    return Promise.resolve({
      closedPosition,
      newPosition,
    });
  }

  async #getUsdtBalance(client: USDMClient): Promise<number> {
    let result: Promise<number>;
    try {
      const balances = await client.getBalance();

      // Get available balance
      const balanceRecord = balances.find((balance) => {
        let availableBalance = 0.0;
        if (balance.asset === "USDT" && typeof balance.availableBalance === "string") {
          availableBalance = Number.parseFloat(balance.availableBalance);
        }

        return availableBalance > 0;
      });

      const availableBalance = balanceRecord ? parseFloat(`${balanceRecord.availableBalance}`) : 0.0;
      result = Promise.resolve(availableBalance);
    } catch (e) {
      result = Promise.resolve(0.0);
    }
    return result;
  }

  async #closeExistingOffer(client: USDMClient, position: FuturesPosition): Promise<NewOrderResult | NewOrderError | undefined> {
    const currPositionAmount = Number.parseFloat(`${position.positionAmt}`);
    let result: Promise<NewOrderResult | NewOrderError | undefined> = Promise.resolve(undefined);
    if (currPositionAmount != 0) {
      result = client.submitNewOrder({
        symbol: position.symbol,
        side: currPositionAmount > 0 ? "SELL" : "BUY",
        type: "MARKET",
        quantity: Math.abs(currPositionAmount),
        reduceOnly: "true",
      });
    }
    return result;
  }
}
