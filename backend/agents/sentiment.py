from typing import Dict, Any
from graph.state import AgentState, AgentSignal

async def sentiment_analysis_agent(state: AgentState) -> Dict[str, Any]:
    """
    Analyzes news headlines and social media sentiment.
    In a full implementation, this calls an LLM (LangChain) parsing news trends.
    """
    print("Running Sentiment Analysis Agent...")
    
    # Mock sentiment extraction
    sentiment_score = 0.65 # Range: 0 (extreme fear) to 1 (extreme greed)
    
    if sentiment_score > 0.6:
        signal_out = "BUY"
        reason="Bullish sentiment in recent news and high social engagement."
        conf = 0.7
    elif sentiment_score < 0.4:
        signal_out = "SELL"
        reason="Bearish sentiment, fear index rising in crypto media."
        conf = 0.75
    else:
        signal_out = "WAIT"
        reason="Neutral sentiment across social and news platforms."
        conf = 0.5
        
    signal = AgentSignal(
        agent_name="Sentiment",
        signal=signal_out,
        confidence=conf,
        reasoning=reason,
        suggested_entry=None, stop_loss=None, take_profit=None, time_window=None
    )
    
    return {"signals": [signal]}
