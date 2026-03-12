from typing import Dict, Any
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field

from graph.state import AgentState, AgentSignal

class DecisionOutput(BaseModel):
    final_decision: str = Field(description="Must be exactly one of: BUY, SELL, or NO TRADE")
    score: float = Field(description="Aggregated conviction score from -1.0 (strong sell) to 1.0 (strong buy)")
    confidence: float = Field(description="Aggregated confidence between 0.0 and 1.0")
    reasoning: str = Field(description="Summary of why this decision was made out of the 4 agents")
    avg_entry: float | None = Field(description="Consensus entry price if BUY/SELL")
    avg_stop_loss: float | None = Field(description="Consensus stop loss price if BUY/SELL")
    avg_take_profit: float | None = Field(description="Consensus take profit price if BUY/SELL")

async def decision_agent(state: AgentState) -> Dict[str, Any]:
    """
    Aggregates the signals from all four agents using an LLM.
    If the Risk agent issues AVOID, it vetoes the trade completely.
    """
    print("Running Decision Aggregation Agent (LLM Powered)...")
    signals = state.get("signals", [])
    symbol = state.get("symbol", "UNKNOWN")
    
    # Check for Veto
    risk_signal = next((s for s in signals if s["agent_name"] == "Risk"), None)
    if risk_signal and risk_signal["signal"] == "AVOID":
        print(f"Trade Vetoed by Risk Agent: {risk_signal['reasoning']}")
        return {"final_decision": "NO TRADE", "execution_details": None}
        
    # Format the signals for the LLM
    signals_text = ""
    for s in signals:
        signals_text += f"\n--- {s['agent_name']} Agent ---\nSignal: {s['signal']}\nConfidence: {s['confidence']}\nReasoning: {s['reasoning']}\n"
        if s.get("suggested_entry"):
            signals_text += f"Target Entry: {s['suggested_entry']} | SL: {s['stop_loss']} | TP: {s['take_profit']}\n"
            
    llm = ChatOpenAI(model="gpt-4o", temperature=0) # use a slightly smarter model for the final decision
    structured_llm = llm.with_structured_output(DecisionOutput)
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are the Chief Investment Officer AI. You receive briefings from Technical, Sentiment, Order Flow, and Risk agents. Synthesize their signals, weighting high-confidence technicals and order flows heavily. If there is a strong consensus, output a BUY or SELL with consensus price targets. If they severely disagree, output NO TRADE. Provide an aggregated score (-1.0 to 1.0)."),
        ("human", "Asset: {symbol}\n\nAgent Reports:\n{reports}")
    ])
    
    try:
        chain = prompt | structured_llm
        response: DecisionOutput = await chain.ainvoke({
            "symbol": symbol,
            "reports": signals_text
        })
        
        final_decision = response.final_decision
        
        execution_details = None
        if final_decision in ["BUY", "SELL"]:
            execution_details = {
                "avg_entry": response.avg_entry,
                "avg_stop_loss": response.avg_stop_loss,
                "avg_take_profit": response.avg_take_profit,
                "score": response.score,
                "confidence": response.confidence,
                "reasoning_summary": response.reasoning
            }
            
        print(f"Final Decision: {final_decision} (Score: {response.score:.2f})")
        print(f"Aggregated Reasoning: {response.reasoning}")
            
    except Exception as e:
        print(f"Decision Agent LLM Error: {e}")
        final_decision = "NO TRADE"
        execution_details = None
    
    return {
        "final_decision": final_decision,
        "execution_details": execution_details
    }
