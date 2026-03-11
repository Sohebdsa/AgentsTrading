from langgraph.graph import StateGraph, START, END
from typing import Dict, Any, List
import operator
from typing import Annotated

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

async def market_data_node(state: RoutingState) -> Dict[str, Any]:
    """Node that fetches market data using the CCXT fetcher."""
    symbol = state["symbol"]
    timeframe = state["timeframe"]
    print(f"Fetching market data for {symbol} ({timeframe})...")
    
    fetcher = MarketDataFetcher('binance')
    df = await fetcher.fetch_ohlcv(symbol, timeframe, limit=50)
    orderbook = await fetcher.fetch_order_book(symbol)
    await fetcher.close()
    
    return {
        "market_data": {
            "ohlcv": df.to_dict('records') if not df.empty else None,
            "orderbook": orderbook
        }
    }

def build_trading_graph() -> StateGraph:
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
    
    workflow.add_edge("DecisionAgent", END)
    
    return workflow.compile()
