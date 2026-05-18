from typing import Dict, Any
import os
from langchain_core.prompts import ChatPromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import BaseModel, Field

from graph.state import AgentState, AgentSignal

# Load SKILL.md at module level
_SKILL_PATH = os.path.join(os.path.dirname(__file__), "skills", "risk_SKILL.md")
with open(_SKILL_PATH, "r", encoding="utf-8") as f:
    SKILL_CONTENT = f.read()

class RiskOutput(BaseModel):
    signal: str = Field(description="Must be exactly one of: WAIT (safe to trade), AVOID (too risky to trade)")
    confidence: float = Field(description="Confidence score between 0.0 and 1.0")
    reasoning: str = Field(description="Detailed explanation of the risk assessment")

async def risk_agent(state: AgentState) -> Dict[str, Any]:
    """
    Analyzes volatility and macro market risk. This agent can issue an AVOID 
    signal which acts as a veto against trades.
    """
    print("Running Risk and Timing Agent (Gemini Powered)...")
    
    symbol = state.get("symbol", "UNKNOWN")
    
    # Mock broader market conditions for now
    vix_approximation = 25 # Elevated volatility
    btc_dominance = 52.5
    
    llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash", temperature=0)
    structured_llm = llm.with_structured_output(RiskOutput)
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", SKILL_CONTENT + "\n\nAssess the current market conditions. If conditions are extremely volatile, uncertain, or risky, issue an 'AVOID' signal. If conditions are acceptable, issue a 'WAIT' signal (no veto). Provide a confidence score and reasoning."),
        ("human", "Asset: {symbol}\n\nMacro Indicators:\nVIX Proxy: {vix}\nBTC Dominance: {btcdom}%\n\nCurrent Market Context:\nModerate volatility observed in recent sessions. Inflation data coming tomorrow.")
    ])
    
    try:
        chain = prompt | structured_llm
        response: RiskOutput = await chain.ainvoke({
            "symbol": symbol,
            "vix": vix_approximation,
            "btcdom": btc_dominance
        })
        
        signal = AgentSignal(
            agent_name="Risk",
            signal=response.signal, # type: ignore
            confidence=response.confidence,
            reasoning=response.reasoning,
            suggested_entry=None, stop_loss=None, take_profit=None, time_window=None
        )
    except Exception as e:
        print(f"Risk Agent LLM Error: {e}")
        signal = AgentSignal(
            agent_name="Risk", signal="WAIT", confidence=0.0,
            reasoning=f"LLM Processing Error: {str(e)}",
            suggested_entry=None, stop_loss=None, take_profit=None, time_window=None
        )
        
    return {"signals": [signal]}
