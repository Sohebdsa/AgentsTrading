from typing import Dict, Any
from graph.state import AgentState

# Weights for scoring
WEIGHTS = {
    "Technical": 0.4,
    "OrderFlow": 0.35,
    "Sentiment": 0.25,
}

async def decision_agent(state: AgentState) -> Dict[str, Any]:
    """
    Aggregates the signals from all four agents. 
    If the Risk agent issues AVOID, it vetoes the trade completely.
    Otherwise, applies a weighted scoring system to decide BUY, SELL, or NO TRADE.
    """
    print("Running Decision Aggregation Agent...")
    signals = state.get("signals", [])
    
    # Check for Veto
    risk_signal = next((s for s in signals if s["agent_name"] == "Risk"), None)
    if risk_signal and risk_signal["signal"] == "AVOID":
        print(f"Trade Vetoed by Risk Agent: {risk_signal['reasoning']}")
        return {"final_decision": "NO TRADE", "execution_details": None}
        
    # Calculate score
    score = 0.0
    total_confidence = 0.0
    
    entry_prices = []
    stop_losses = []
    take_profits = []
    
    for sig in signals:
        name = sig["agent_name"]
        if name not in WEIGHTS:
            continue
            
        weight = WEIGHTS[name]
        conf = sig["confidence"]
        direction = 1 if sig["signal"] == "BUY" else (-1 if sig["signal"] == "SELL" else 0)
        
        score += direction * weight * conf
        total_confidence += weight * conf
        
        if direction != 0 and sig["suggested_entry"]:
            entry_prices.append(sig["suggested_entry"])
        if direction != 0 and sig["stop_loss"]:
            stop_losses.append(sig["stop_loss"])
        if direction != 0 and sig["take_profit"]:
            take_profits.append(sig["take_profit"])

    # Final decision thresholds
    final_decision = "NO TRADE"
    if score > 0.3:
        final_decision = "BUY"
    elif score < -0.3:
        final_decision = "SELL"
        
    execution_details = None
    if final_decision in ["BUY", "SELL"]:
        # Average out the suggested levels
        execution_details = {
            "avg_entry": sum(entry_prices)/len(entry_prices) if entry_prices else None,
            "avg_stop_loss": sum(stop_losses)/len(stop_losses) if stop_losses else None,
            "avg_take_profit": sum(take_profits)/len(take_profits) if take_profits else None,
            "score": score,
            "confidence": total_confidence
        }
        
    print(f"Final Decision: {final_decision} (Score: {score:.2f})")
    
    return {
        "final_decision": final_decision,
        "execution_details": execution_details
    }
