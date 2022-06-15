import { Injectable } from "@nestjs/common";
import {
  CancelAllOpenOrdersResult,
  FuturesAccountBalance,
  FuturesPosition,
  FuturesSymbolExchangeInfo,
  NewFuturesOrderParams,
  NewOrderError,
  NewOrderResult,
  OrderSide,
  OrderTimeInForce,
  RestClientOptions,
  USDMClient,
  WebsocketClientOptions,
} from "binance";

export interface StopLimitOrderParams {
  symbol: string;
  orderSide: OrderSide;
  price: number;
  takeProfitPrice?: number;
  stopLossPrice: number;
  quantity: number;
}

@Injectable()
export class AppService {
  private options: Pick<WebsocketClientOptions & RestClientOptions, "api_key" | "api_secret"> = {
    api_key: "qT4vKL9C9gjuV2J93KwYGe5h106OhpnqfLCp0erUjYEeUeJlUD0K5Ij9CBsqECto",
    api_secret: "JWIoCzwG8OoDe5wxJ0UYJywHqbXTpiYbZWGOEngGMCVcPjZgvd6L6qXrgJIKDO1o",
    // api_key: "0b65e81fba5e592367d247fd2b37948c23e3527af00a87c719837ac512fe076b",
    // api_secret: "c3eb1b7e64607ae049d1dc20114cbb84d6d9d1b961f4fe870feb21e4ad62407d",
  };
  private usdmClient = this.#getUsdmClient();

  public async getAccountBalance(asset = "USDT"): Promise<FuturesAccountBalance> {
    return this.usdmClient.getBalance().then((data) => {
      return data.find((b) => b.asset === asset);
    });
  }

  public async closePositionForSymbolOrder(symbol: string): Promise<NewOrderResult | NewOrderError | undefined> {
    // Close all orders
    const positions = await this.usdmClient.getPositions();
    const position = positions.find((p) => p.symbol === symbol);

    let closedPosition: NewOrderResult | NewOrderError | undefined;
    try {
      closedPosition = await this.#closeExistingOffer(this.usdmClient, position);
    } catch (e) {
      closedPosition = undefined;
    }

    return closedPosition;
  }

  public async cancelAllOpenedOrders(symbol: string): Promise<CancelAllOpenOrdersResult> {
    return this.usdmClient.cancelAllOpenOrders({
      symbol,
    });
  }

  public async getSymbolInfo(symbol: string): Promise<FuturesSymbolExchangeInfo | undefined> {
    return this.usdmClient.getExchangeInfo().then((result) => {
      return result.symbols.find((s) => s.symbol === symbol);
    });
  }

  public calculatePnlLong(currentPrice: number, buyPrice: number, positionSize: number): number {
    return (currentPrice - buyPrice) * positionSize;
  }

  public calculatePnlShort(currentPrice: number, sellPrice: number, positionSize: number): number {
    return (sellPrice - currentPrice) * positionSize;
  }

  public targetSellPositionSize(sellPrice: number, stopPrice: number, targetLoss: number): number {
    const oneUnitLoss = Math.abs(this.calculatePnlShort(sellPrice, stopPrice, 1));
    return Math.abs(targetLoss) / oneUnitLoss;
  }

  public targetBuyPositionSize(buyPrice: number, stopPrice: number, targetLoss: number): number {
    const oneUnitLoss = Math.abs(this.calculatePnlLong(buyPrice, stopPrice, 1));
    return Math.abs(targetLoss) / oneUnitLoss;
  }

  async createStopLimit({ symbol, orderSide, price, quantity, takeProfitPrice, stopLossPrice }: StopLimitOrderParams): Promise<(NewOrderResult | NewOrderError)[]> {
    const limitOrder: NewFuturesOrderParams = {
      symbol,
      side: orderSide,
      type: "LIMIT",
      price: price.toFixed(8) as unknown as number,
      quantity: quantity.toFixed(8) as unknown as number,
      timeInForce: "GTX" as unknown as OrderTimeInForce,
    };

    const stopLossOrder: NewFuturesOrderParams = {
      symbol,
      side: orderSide === "BUY" ? "SELL" : "BUY",
      type: "STOP_MARKET",
      stopPrice: stopLossPrice.toFixed(8) as unknown as number,
      quantity: quantity.toFixed(8) as unknown as number,
      reduceOnly: "true",
      priceProtect: "TRUE",
    };

    let takeProfitOrder: NewFuturesOrderParams;
    if (takeProfitPrice) {
      takeProfitOrder = {
        symbol,
        side: orderSide === "BUY" ? "SELL" : "BUY",
        type: "TAKE_PROFIT",
        price: takeProfitPrice.toFixed(8) as unknown as number,
        stopPrice: takeProfitPrice.toFixed(8) as unknown as number,
        quantity: quantity.toFixed(8) as unknown as number,
        reduceOnly: "true",
        timeInForce: "GTX" as unknown as OrderTimeInForce,
        priceProtect: "TRUE",
      };
    }

    const batchOrders = [JSON.stringify(limitOrder), JSON.stringify(stopLossOrder), ...(takeProfitPrice ? JSON.stringify(takeProfitOrder) : [])];

    return this.usdmClient.postPrivate("fapi/v1/batchOrders", {
      batchOrders: "[" + batchOrders.join(",") + "]",
    });
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

  #getUsdmClient(): USDMClient {
    return new USDMClient(
      {
        ...this.options,
        beautifyResponses: true,
      },
      {},
      false
    );
  }
}
