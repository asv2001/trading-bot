import { Body, Controller, Post, Query } from "@nestjs/common";
import { TradingViewMessage } from "@trading-bot/types";
import { USDMClient } from "binance";
import { AppService } from "./app.service";

@Controller("orders")
export class AppController {
  constructor(private appService: AppService) {}

  @Post("create")
  public executeOrder(@Query("accountId") accountId: string, @Body() body: TradingViewMessage): void {
    console.log("Got a position request", body);

    const client = new USDMClient({
      api_key: "qT4vKL9C9gjuV2J93KwYGe5h106OhpnqfLCp0erUjYEeUeJlUD0K5Ij9CBsqECto",
      api_secret: "JWIoCzwG8OoDe5wxJ0UYJywHqbXTpiYbZWGOEngGMCVcPjZgvd6L6qXrgJIKDO1o",
    });

    this.appService.executeOrder({
      positionSizeRatio: 0.02,
      client,
      message: body
    }).then((result) => {
      if (result.closedPosition) {
        console.log("Closed position", result.closedPosition);
      }

      if (result.newPosition) {
        console.log("New position", result.newPosition);
      }
    }).catch((e) => {
      console.error("Caught an unknown error", e);
    });
  }
}
