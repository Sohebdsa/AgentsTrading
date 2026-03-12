from typing import Dict, Any
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field

from graph.state import AgentState, AgentSignal

class SentimentOutput(BaseModel):
    signal: str = Field(description="Must be exactly one of: BUY, SELL, WAIT, or AVOID")
    confidence: float = Field(description="Confidence score between 0.0 and 1.0")
    reasoning: str = Field(description="Detailed explanation of the sentiment analysis forming this decision")

async def sentiment_analysis_agent(state: AgentState) -> Dict[str, Any]:
    """
    Analyzes news headlines and social media sentiment using an LLM.
    """
    print("Running Sentiment Analysis Agent (LLM Powered)...")
    
    symbol = state.get("symbol", "UNKNOWN")
    
    # In a full implementation, you would fetch actual news using a News API tool here.
    # For now, we simulate recent news events related to the symbol.
    simulated_news = f"""
    1. {symbol} releases new product update, users react positively on Twitter!
    2. Regulatory rumors cause slight dip in {symbol} stock temporarily.
    3. Institutional accumulation observed in {symbol} on-chain data.
    4. General macroeconomic fear grips the broader market, investors cautious.
    """
    
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
    structured_llm = llm.with_structured_output(SentimentOutput)
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are an expert Sentiment Analysis AI Agent. Analyze the provided news updates and social sentiment for the asset. Determine if the overall sentiment is bullish (BUY), bearish (SELL), or neutral (WAIT). Output a strict confidence score and reasoning."),
        ("human", "Asset: {symbol}\n\nRecent News & Social Trends:\n{news}")
    ])
    
    try:
        chain = prompt | structured_llm
        response: SentimentOutput = await chain.ainvoke({
            "symbol": symbol,
            "news": simulated_news
        })
        
        signal = AgentSignal(
            agent_name="Sentiment",
            signal=response.signal, # type: ignore
            confidence=response.confidence,
            reasoning=response.reasoning,
            suggested_entry=None, stop_loss=None, take_profit=None, time_window=None
        )
    except Exception as e:
        print(f"Sentiment Agent LLM Error: {e}")
        signal = AgentSignal(
            agent_name="Sentiment", signal="WAIT", confidence=0.0,
            reasoning=f"LLM Processing Error: {str(e)}",
            suggested_entry=None, stop_loss=None, take_profit=None, time_window=None
        )
    
    return {"signals": [signal]}
