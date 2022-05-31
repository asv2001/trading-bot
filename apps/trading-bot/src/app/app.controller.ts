import { Body, Controller, Post, Query } from "@nestjs/common";
import { TradingViewMessage } from "@trading-bot/types";

@Controller("orders")
export class AppController {
  @Post("create")
  public executeOrder(
    @Query("accountId") accountId: string,
    @Body() body: TradingViewMessage
  ): void {
    console.log(accountId, body);
  }
}
