from typing import Dict, Any
from graph.state import AgentState, AgentSignal

async def risk_agent(state: AgentState) -> Dict[str, Any]:
    """
    Analyzes volatility and macro market risk. This agent can issue an AVOID 
    signal which acts as a veto against trades.
    """
    print("Running Risk and Timing Agent...")
    
    # Mock volatility index (e.g. VIX approximation or historical ATR)
    current_volatility = 0.85 # High volatility
    max_acceptable_volatility = 0.80
    
    if current_volatility > max_acceptable_volatility:
        signal_out = "AVOID"
        reason = f"Market volatility ({current_volatility}) exceeds threshold ({max_acceptable_volatility}). Unsafe to enter."
        conf = 0.95
    else:
        signal_out = "WAIT" # Doesn't enforce a trade, just passes safe check
        reason = "Market volatility is within acceptable limits for trading."
        conf = 0.9
        
    signal = AgentSignal(
        agent_name="Risk",
        signal=signal_out,
        confidence=conf,
        reasoning=reason,
        suggested_entry=None, stop_loss=None, take_profit=None, time_window=None
    )
    
    return {"signals": [signal]}
