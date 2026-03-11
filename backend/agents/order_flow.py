from typing import Dict, Any
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field

from graph.state import AgentState, AgentSignal

class OrderFlowOutput(BaseModel):
    signal: str = Field(description="Must be exactly one of: BUY, SELL, WAIT, or AVOID")
    confidence: float = Field(description="Confidence score between 0.0 and 1.0")
    reasoning: str = Field(description="Detailed explanation of the order book analysis")

async def order_flow_agent(state: AgentState) -> Dict[str, Any]:
    """
    Analyzes the order book depth and exchange flows using an LLM.
    """
    print("Running Order Flow Agent (LLM Powered)...")
    
    market_data = state.get("market_data", {})
    orderbook = market_data.get("orderbook")
    symbol = state.get("symbol", "UNKNOWN")
    
    if not orderbook:
        signal = AgentSignal(
            agent_name="OrderFlow", signal="WAIT", confidence=0.0,
            reasoning="No orderbook data available.",
            suggested_entry=None, stop_loss=None, take_profit=None, time_window=None
        )
        return {"signals": [signal]}
        
    bids = orderbook.get("bids", [])[:10] # Top 10 bids
    asks = orderbook.get("asks", [])[:10] # Top 10 asks
    
    bids_str = "\n".join([f"Price: {p}, Size: {s}" for p, s in bids])
    asks_str = "\n".join([f"Price: {p}, Size: {s}" for p, s in asks])
    
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
    structured_llm = llm.with_structured_output(OrderFlowOutput)
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are an expert Order Flow and Liquidity Analysis AI Agent. Analyze the top levels of the order book. Detect bid/ask walls, spoofing, or strong buying/selling pressure. Produce a trade signal (BUY for strong bid pressure, SELL for strong ask pressure, WAIT for balanced)."),
        ("human", "Asset: {symbol}\n\nTop 10 Bids (Buyers):\n{bids}\n\nTop 10 Asks (Sellers):\n{asks}")
    ])
    
    try:
        chain = prompt | structured_llm
        response: OrderFlowOutput = await chain.ainvoke({
            "symbol": symbol,
            "bids": bids_str,
            "asks": asks_str
        })
        
        signal = AgentSignal(
            agent_name="OrderFlow",
            signal=response.signal, # type: ignore
            confidence=response.confidence,
            reasoning=response.reasoning,
            suggested_entry=None, stop_loss=None, take_profit=None, time_window=None
        )
    except Exception as e:
        print(f"Order Flow Agent LLM Error: {e}")
        signal = AgentSignal(
            agent_name="OrderFlow", signal="WAIT", confidence=0.0,
            reasoning=f"LLM Processing Error: {str(e)}",
            suggested_entry=None, stop_loss=None, take_profit=None, time_window=None
        )
    
    return {"signals": [signal]}
