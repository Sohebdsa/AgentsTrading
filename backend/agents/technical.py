from typing import Dict, Any
import ta
import pandas as pd
from graph.state import AgentState, AgentSignal

async def technical_analysis_agent(state: AgentState) -> Dict[str, Any]:
    """
    Analyzes historical price data using technical indicators (RSI, MACD, MA)
    and returns a trading signal.
    """
    print("Running Technical Analysis Agent...")
    
    market_data = state.get("market_data", {})
    df_dict = market_data.get("ohlcv")
    
    if not df_dict:
        # No data fetched, return WAIT
        signal = AgentSignal(
            agent_name="Technical", signal="WAIT", confidence=0.0,
            reasoning="No OHLCV data provided in market state.",
            suggested_entry=None, stop_loss=None, take_profit=None, time_window=None
        )
        return {"signals": [signal]}
        
    # Reconstruct pandas DataFrame
    df = pd.DataFrame(df_dict)
    
    # Calculate basic indicators
    df['rsi'] = ta.momentum.RSIIndicator(df['close'], window=14).rsi()
    macd = ta.trend.MACD(df['close'])
    df['macd'] = macd.macd()
    df['macd_signal'] = macd.macd_signal()
    df['sma_50'] = ta.trend.SMAIndicator(df['close'], window=50).sma_indicator()
    
    latest = df.iloc[-1]
    close = float(latest['close'])
    rsi = float(latest['rsi'])
    
    # Simple strategy logic (replace with LLM or robust logic)
    signal_out = "WAIT"
    reasoning = f"Price: {close:.2f}, RSI: {rsi:.2f}. "
    confidence = 0.5
    
    if rsi < 30 and latest['macd'] > latest['macd_signal']:
        signal_out = "BUY"
        reasoning += "Oversold with MACD cross up."
        confidence = 0.8
    elif rsi > 70 and latest['macd'] < latest['macd_signal']:
        signal_out = "SELL"
        reasoning += "Overbought with MACD cross down."
        confidence = 0.8
        
    signal = AgentSignal(
        agent_name="Technical",
        signal=signal_out,
        confidence=confidence,
        reasoning=reasoning,
        suggested_entry=close if signal_out != "WAIT" else None,
        stop_loss=close * 0.95 if signal_out == "BUY" else close * 1.05,
        take_profit=close * 1.10 if signal_out == "BUY" else close * 0.90,
        time_window="1d"
    )
    
    return {"signals": [signal]}
