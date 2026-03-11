from typing import Dict, Any
from graph.state import AgentState, AgentSignal

async def order_flow_agent(state: AgentState) -> Dict[str, Any]:
    """
    Analyzes the order book depth and exchange flows to detect liquidity walls 
    and whale orders.
    """
    print("Running Order Flow Agent...")
    market_data = state.get("market_data", {})
    orderbook = market_data.get("orderbook")
    
    if not orderbook:
        signal = AgentSignal(
            agent_name="OrderFlow", signal="WAIT", confidence=0.0,
            reasoning="No orderbook data available.",
            suggested_entry=None, stop_loss=None, take_profit=None, time_window=None
        )
        return {"signals": [signal]}
        
    bids = orderbook.get("bids", []) # [(price, size), ...]
    asks = orderbook.get("asks", [])
    
    # Simple order book imbalance calculation
    bid_vol = sum(size for price, size in bids[:10])
    ask_vol = sum(size for price, size in asks[:10])
    
    imbalance = bid_vol / (bid_vol + ask_vol + 1e-9)
    
    if imbalance > 0.65:
        signal_out = "BUY"
        reason = f"Strong bid-side wall detected. Bid/Ask ratio: {imbalance:.2f}"
        conf = 0.65
    elif imbalance < 0.35:
        signal_out = "SELL"
        reason = f"Heavy selling pressure in orderbook. Bid/Ask ratio: {imbalance:.2f}"
        conf = 0.65
    else:
        signal_out = "WAIT"
        reason = f"Orderbook balanced. Imbalance: {imbalance:.2f}"
        conf = 0.4
        
    signal = AgentSignal(
        agent_name="OrderFlow",
        signal=signal_out,
        confidence=conf,
        reasoning=reason,
        suggested_entry=None, stop_loss=None, take_profit=None, time_window=None
    )
    
    return {"signals": [signal]}
