import { Body, Controller, Post, Query } from "@nestjs/common";
import { TradingViewMarketPosition, TradingViewMessage } from "@trading-bot/types";

import { USDMClient } from "binance";

// client.getAccountTradeList({ symbol: 'BTCUSDT' })
//   .then(result => {
//     console.log("getAccountTradeList result: ", result);
//   })
//   .catch(err => {
//     console.error("getAccountTradeList error: ", err);
//   });
//
// client.getExchangeInfo()
//   .then(result => {
//     console.log("getExchangeInfo inverse result: ", result);
//   })
//   .catch(err => {
//     console.error("getExchangeInfo inverse error: ", err);
//   });
//

// const client = new MainClient({
//   api_key: "qT4vKL9C9gjuV2J93KwYGe5h106OhpnqfLCp0erUjYEeUeJlUD0K5Ij9CBsqECto",
//   // api_key: accountId,
//   api_secret: "JWIoCzwG8OoDe5wxJ0UYJywHqbXTpiYbZWGOEngGMCVcPjZgvd6L6qXrgJIKDO1o",
// });

// client.getBalances().then((balances) => {
//   const balance = balances.filter((b) => {
//     return b.free > 0;
//   })
//   console.log(balance);
//
// });

@Controller("orders")
export class AppController {
  @Post("create")
  public executeOrder(@Query("accountId") accountId: string, @Body() body: TradingViewMessage): void {
    console.log(body);

    const client = new USDMClient({
      api_key: "qT4vKL9C9gjuV2J93KwYGe5h106OhpnqfLCp0erUjYEeUeJlUD0K5Ij9CBsqECto",
      // api_key: accountId,
      api_secret: "JWIoCzwG8OoDe5wxJ0UYJywHqbXTpiYbZWGOEngGMCVcPjZgvd6L6qXrgJIKDO1o",
    });

    client.getBalance().then((balances) => {
      // Get available balance
      const balance = balances.find((balance) => {
        let availableBalance = 0.0;
        if (balance.asset === "USDT" && typeof balance.availableBalance === "string") {
          availableBalance = Number.parseFloat(balance.availableBalance);
        }

        return availableBalance > 0;
      });

      const availableBalance = balance ? parseFloat(balance.availableBalance + "") : 0.0;

      const leverage = 50;
      const positionSize = availableBalance * 0.1;

      // Close all orders
      client.getPositions().then((positions) => {
        positions.forEach((p) => {
          client
            .submitNewOrder({
              symbol: p.symbol,
              side: p.positionSide === "LONG" ? "SELL" : "BUY",
              type: "MARKET",
              quantity: Number.parseFloat(p.positionAmt + ""),
            })
            .then((result) => {
              console.log(result);
            })
            .catch((err) => {
              console.log(err);
            });
        });
      });

      client
        .submitNewOrder({
          symbol: body.ticker.replace("PERP", ""),
          side: body.strategy_market_position === TradingViewMarketPosition.Long ? "BUY" : "SELL",
          type: "MARKET",
          quantity: Math.round(((positionSize * leverage) / Number.parseFloat(body.close)) * 10) / 10,
        })
        .then((result) => {
          console.log(result);
        })
        .catch((err) => {
          console.log(err);
        });
    });
  }
}
