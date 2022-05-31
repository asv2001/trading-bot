export enum TradingViewAction {
  Sell = "sell",
  Buy = "buy",
}

export enum TradingViewMarketPosition {
  Long = "long",
  Flat = "flat",
  Short = "short"
}

export interface TradingViewMessage {
  exchange: string;
  ticker: string;
  interval: string;
  time: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  timenow: string;
	position_size: string;
	strategy_order_action: TradingViewAction;
	strategy_order_contracts: string;
	strategy_order_price: string;
	strategy_order_id: string;
	strategy_order_comment: string;
	strategy_order_alert_message: string;
	strategy_market_position: TradingViewMarketPosition;
	strategy_market_position_size: string;
	strategy_prev_market_position: TradingViewMarketPosition;
	strategy_prev_market_position_size: string;
  plot: string;
}

/*
{
  "exchange": "{{exchange}}",
  "ticker": "{{ticker}}",
  "interval": "{{interval}}",
  "time": "{{time}}",
  "open": "{{open}}",
  "high": "{{high}}",
  "low": "{{low}}",
  "close": "{{close}}",
  "volume": "{{volume}}",
  "timenow": "{{timenow}}",
  "position_size": "{{strategy.position_size}}",
  "strategy_order_action": "{{strategy.order.action}}",
  "strategy_order_contracts": "{{strategy.order.contracts}}",
  "strategy_order_price": "{{strategy.order.price}}",
  "strategy_order_id": "{{strategy.order.id}}",
  "strategy_order_comment": "{{strategy.order.comment}}",
  "strategy_order_alert_message": "{{strategy.order.alert_message}}",
  "strategy_market_position": "{{strategy.market_position}}",
  "strategy_market_position_size": "{{strategy.market_position_size}}",
  "strategy_prev_market_position": "{{strategy.prev_market_position}}",
  "strategy_prev_market_position_size": "{{strategy.prev_market_position_size}}",
  "plot": "{{plot_0}}"
}
*/
