from langgraph.graph import StateGraph, START, END
from typing import Dict, Any, List, Annotated
import operator
import random
import datetime

from data.fetcher import MarketDataFetcher
from graph.state import AgentSignal, AgentState
from agents.technical import technical_analysis_agent
from agents.sentiment import sentiment_analysis_agent
from agents.order_flow import order_flow_agent
from agents.risk import risk_agent
from agents.decision import decision_agent


# Local redefined TypedDict to handle the `Annotated[list, operator.add]` properly for edges
class RoutingState(AgentState):
    signals: Annotated[list, operator.add]


def _generate_synthetic_ohlcv(symbol: str, bars: int = 50) -> list:
    """Generate realistic synthetic OHLCV candles when live data is unavailable."""
    # Use rough price levels based on the symbol name
    base_prices = {
        "BTC": 70000, "ETH": 3800, "BNB": 580, "SOL": 180,
        "ADA": 0.45, "XRP": 0.52, "DOGE": 0.12, "AAPL": 220,
        "TSLA": 260, "NVDA": 870, "SPY": 510, "QQQ": 440,
    }
    price = 70000  # default
    sym_upper = symbol.upper()
    for ticker, p in base_prices.items():
        if ticker in sym_upper:
            price = p
            break

    candles = []
    ts = int((datetime.datetime.utcnow() - datetime.timedelta(hours=bars)).timestamp() * 1000)
    for _ in range(bars):
        change_pct = random.uniform(-0.02, 0.02)
        open_ = price
        close = open_ * (1 + change_pct)
        high = max(open_, close) * random.uniform(1.001, 1.015)
        low  = min(open_, close) * random.uniform(0.985, 0.999)
        volume = random.uniform(100, 5000) * price
        candles.append({
            "timestamp": datetime.datetime.utcfromtimestamp(ts / 1000).isoformat(),
            "open": round(open_, 6),
            "high": round(high, 6),
            "low":  round(low, 6),
            "close": round(close, 6),
            "volume": round(volume, 2)
        })
        price = close
        ts += 3600 * 1000  # next hourly candle
    return candles


def _generate_synthetic_orderbook(price: float) -> Dict[str, Any]:
    """Generate a realistic synthetic order book around a price level."""
    bids = [[round(price * (1 - i * 0.0005), 4), round(random.uniform(0.1, 5), 4)] for i in range(1, 21)]
    asks = [[round(price * (1 + i * 0.0005), 4), round(random.uniform(0.1, 5), 4)] for i in range(1, 21)]
    return {"bids": bids, "asks": asks}


async def human_approval_node(state: RoutingState) -> Dict[str, Any]:
    """
    This node acts as a pause point. The graph halts execution before running
    this node, allowing a human to review the decision and approve or reject it.
    """
    print("Graph execution paused for Human Approval...")
    return {}


async def market_data_node(state: RoutingState) -> Dict[str, Any]:
    """Node that fetches market data using the CCXT fetcher.
    Falls back to synthetic data if the exchange is unreachable (e.g. geo-restrictions).
    """
    symbol = state["symbol"]
    timeframe = state["timeframe"]
    print(f"Fetching market data for {symbol} ({timeframe})...")

    ohlcv = None
    orderbook = None

    try:
        fetcher = MarketDataFetcher('binance')
        import pandas as pd
        df = await fetcher.fetch_ohlcv(symbol, timeframe, limit=50)
        raw_ob = await fetcher.fetch_order_book(symbol)
        await fetcher.close()

        if not df.empty:
            ohlcv = df.to_dict('records')
        if raw_ob.get("bids"):
            orderbook = raw_ob
    except Exception as e:
        print(f"Live data fetch failed: {e}. Using synthetic data.")

    # --- Synthetic fallback ---
    if not ohlcv:
        print(f"[SYNTHETIC] Generating OHLCV data for {symbol}")
        ohlcv = _generate_synthetic_ohlcv(symbol)

    if not orderbook:
        last_close = ohlcv[-1]["close"] if ohlcv else 70000
        print(f"[SYNTHETIC] Generating order book at price {last_close}")
        orderbook = _generate_synthetic_orderbook(last_close)

    return {
        "market_data": {
            "ohlcv": ohlcv,
            "orderbook": orderbook,
            "synthetic": True  # flag so agents can note data is simulated
        }
    }


def build_trading_graph(checkpointer=None):
    """Compiles the LangGraph for the multi-agent system."""

    workflow = StateGraph(RoutingState)

    # 1. Add Data Node
    workflow.add_node("MarketData", market_data_node)

    # 2. Add the specialized agent nodes
    workflow.add_node("TechnicalAgent", technical_analysis_agent)
    workflow.add_node("SentimentAgent", sentiment_analysis_agent)
    workflow.add_node("OrderFlowAgent", order_flow_agent)
    workflow.add_node("RiskAgent", risk_agent)

    # 3. Add the Decision Aggregation Node
    workflow.add_node("DecisionAgent", decision_agent)

    # 4. Add the Human Approval Node (Interrupt Point)
    workflow.add_node("HumanApproval", human_approval_node)

    # Compile the flow
    workflow.add_edge(START, "MarketData")

    # Data flows into all 4 agents in parallel
    workflow.add_edge("MarketData", "TechnicalAgent")
    workflow.add_edge("MarketData", "SentimentAgent")
    workflow.add_edge("MarketData", "OrderFlowAgent")
    workflow.add_edge("MarketData", "RiskAgent")

    # All 4 agents flow into Decision Aggregator
    workflow.add_edge("TechnicalAgent", "DecisionAgent")
    workflow.add_edge("SentimentAgent", "DecisionAgent")
    workflow.add_edge("OrderFlowAgent", "DecisionAgent")
    workflow.add_edge("RiskAgent", "DecisionAgent")

    # Decision flows to Human Approval
    workflow.add_edge("DecisionAgent", "HumanApproval")
    workflow.add_edge("HumanApproval", END)

    return workflow.compile(
        checkpointer=checkpointer,
        interrupt_before=["HumanApproval"]
    )
