from typing import Dict, Any
import pandas as pd
import ta
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field

from graph.state import AgentState, AgentSignal

class SignalOutput(BaseModel):
    signal: str = Field(description="Must be exactly one of: BUY, SELL, WAIT, or AVOID")
    confidence: float = Field(description="Confidence score between 0.0 and 1.0")
    reasoning: str = Field(description="Detailed technical explanation for the decision")
    suggested_entry: float | None = Field(description="Suggested entry price if BUY or SELL, otherwise null")
    stop_loss: float | None = Field(description="Suggested stop loss price if BUY or SELL, otherwise null")
    take_profit: float | None = Field(description="Suggested take profit price if BUY or SELL, otherwise null")
    time_window: str | None = Field(description="Expected time window for the trade to play out, e.g. '1d', '4h'")

async def technical_analysis_agent(state: AgentState) -> Dict[str, Any]:
    """
    Analyzes historical price data using technical indicators and an LLM to formulate a signal.
    """
    print("Running Technical Analysis Agent (LLM Powered)...")
    
    market_data = state.get("market_data", {})
    df_dict = market_data.get("ohlcv")
    symbol = state.get("symbol", "UNKNOWN")
    timeframe = state.get("timeframe", "1h")
    
    if not df_dict:
        signal = AgentSignal(
            agent_name="Technical", signal="WAIT", confidence=0.0,
            reasoning="No OHLCV data provided in market state.",
            suggested_entry=None, stop_loss=None, take_profit=None, time_window=None
        )
        return {"signals": [signal]}
        
    # Reconstruct pandas DataFrame and compute indicators
    df = pd.DataFrame(df_dict)
    
    df['rsi'] = ta.momentum.RSIIndicator(df['close'], window=14).rsi()
    macd = ta.trend.MACD(df['close'])
    df['macd'] = macd.macd()
    df['macd_signal'] = macd.macd_signal()
    df['sma_50'] = ta.trend.SMAIndicator(df['close'], window=50).sma_indicator()
    
    latest = df.iloc[-1]
    recent_action = df.tail(5)[['timestamp', 'open', 'high', 'low', 'close', 'volume']].to_string(index=False)
    
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
    structured_llm = llm.with_structured_output(SignalOutput)
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are an expert Technical Analysis AI Agent. Analyze the provided price data and technical indicators. Provide a highly accurate trading signal (BUY, SELL, WAIT) with detailed reasoning based strictly on technical analysis principles."),
        ("human", "Symbol: {symbol}\nTimeframe: {timeframe}\nLatest Close: ${close}\nSMA(50): ${sma}\nRSI(14): {rsi}\nMACD: {macd}, MACD Signal: {macd_signal}\n\nRecent Price Candles:\n{recent_action}")
    ])
    
    try:
        chain = prompt | structured_llm
        response: SignalOutput = await chain.ainvoke({
            "symbol": symbol,
            "timeframe": timeframe,
            "close": f"{latest['close']:.4f}",
            "sma": f"{latest['sma_50']:.4f}" if not pd.isna(latest['sma_50']) else "N/A",
            "rsi": f"{latest['rsi']:.2f}" if not pd.isna(latest['rsi']) else "N/A",
            "macd": f"{latest['macd']:.4f}" if not pd.isna(latest['macd']) else "N/A",
            "macd_signal": f"{latest['macd_signal']:.4f}" if not pd.isna(latest['macd_signal']) else "N/A",
            "recent_action": recent_action
        })
        
        signal = AgentSignal(
            agent_name="Technical",
            signal=response.signal, # type: ignore
            confidence=response.confidence,
            reasoning=response.reasoning,
            suggested_entry=response.suggested_entry,
            stop_loss=response.stop_loss,
            take_profit=response.take_profit,
            time_window=response.time_window
        )
    except Exception as e:
        print(f"Technical Agent LLM Error: {e}")
        signal = AgentSignal(
            agent_name="Technical", signal="WAIT", confidence=0.0,
            reasoning=f"LLM Processing Error: {str(e)}",
            suggested_entry=None, stop_loss=None, take_profit=None, time_window=None
        )
        
    return {"signals": [signal]}
