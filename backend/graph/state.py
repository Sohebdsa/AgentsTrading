from typing import TypedDict, List, Dict, Any, Literal
import operator

# Represents a single agent's analysis output
class AgentSignal(TypedDict):
    agent_name: str
    signal: Literal["BUY", "SELL", "WAIT", "AVOID"]
    confidence: float
    reasoning: str
    suggested_entry: float | None
    stop_loss: float | None
    take_profit: float | None
    time_window: str | None

# Shared memory across the graph
class AgentState(TypedDict):
    # Context injected at the start of the DAG
    symbol: str
    timeframe: str
    market_data: Dict[str, Any]  # Current price, trend, orderbook stats
    
    # Each agent appends its signal here.
    # We use list + operator.add in a real LangGraph Setup via Annotated
    # but for simple TypedDict definitions, we define the structure here.
    signals: List[AgentSignal]
    
    # The final aggregated decision by the Decision Agent
    final_decision: Literal["BUY", "SELL", "WAIT", "NO TRADE"] | None
    execution_details: Dict[str, Any] | None
    
    # Store history / global memory (retrieved from DB)
    trade_history: List[Dict[str, Any]]
