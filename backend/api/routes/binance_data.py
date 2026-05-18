from fastapi import APIRouter, HTTPException
from fastapi.encoders import jsonable_encoder
from data.fetcher import MarketDataFetcher
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional
import pandas as pd
import ta
import random
import datetime
import logging

log = logging.getLogger("binance_data")

router = APIRouter(prefix="/binance", tags=["Binance Data"])


# ─── Pydantic models ────────────────────────────────────────────

class AIFetchRequest(BaseModel):
    timeframe: str = "1h"
    limit: int = 50


class AIInsight(BaseModel):
    summary: str = Field(description="Brief summary of the market data analysis")
    key_levels: str = Field(description="Key support/resistance levels identified")
    trend: str = Field(description="Current trend direction: BULLISH, BEARISH, or SIDEWAYS")
    recommendation: str = Field(description="Brief actionable insight")


# ─── Synthetic data generators (fallback) ────────────────────────

BASE_PRICES = {
    "BTC": 70000, "ETH": 3800, "BNB": 580, "SOL": 180,
    "ADA": 0.45, "XRP": 0.52, "DOGE": 0.12, "AAPL": 220,
    "TSLA": 260, "NVDA": 870, "SPY": 510, "QQQ": 440,
}

def _get_base_price(symbol: str) -> float:
    sym = symbol.upper().replace("/", "").replace("_", "")
    for ticker, p in BASE_PRICES.items():
        if ticker in sym:
            return p
    return 70000

def _synthetic_ohlcv(symbol: str, bars: int = 50) -> list:
    price = _get_base_price(symbol)
    candles = []
    ts = datetime.datetime.utcnow() - datetime.timedelta(hours=bars)
    for _ in range(bars):
        change = random.uniform(-0.02, 0.02)
        o = price
        c = o * (1 + change)
        h = max(o, c) * random.uniform(1.001, 1.015)
        l = min(o, c) * random.uniform(0.985, 0.999)
        v = random.uniform(100, 5000) * price
        candles.append({
            "timestamp": ts.isoformat(),
            "open": round(o, 6), "high": round(h, 6),
            "low": round(l, 6), "close": round(c, 6),
            "volume": round(v, 2),
        })
        price = c
        ts += datetime.timedelta(hours=1)
    return candles

def _synthetic_orderbook(symbol: str) -> dict:
    price = _get_base_price(symbol)
    bids = [[round(price * (1 - i * 0.0005), 4), round(random.uniform(0.1, 5), 4)] for i in range(1, 21)]
    asks = [[round(price * (1 + i * 0.0005), 4), round(random.uniform(0.1, 5), 4)] for i in range(1, 21)]
    return {"bids": bids, "asks": asks}

def _synthetic_ticker(symbol: str) -> dict:
    price = _get_base_price(symbol)
    change = random.uniform(-3, 3)
    return {
        "last": round(price, 4),
        "bid": round(price * 0.9998, 4),
        "ask": round(price * 1.0002, 4),
        "high": round(price * random.uniform(1.01, 1.04), 4),
        "low": round(price * random.uniform(0.96, 0.99), 4),
        "quoteVolume": round(random.uniform(5e8, 2e9), 0),
        "percentage": round(change, 2),
        "vwap": round(price * random.uniform(0.99, 1.01), 4),
    }


# ─── Helper: agent data map ─────────────────────────────────────

AGENT_DATA_MAP = {
    "technical": ["ohlcv", "indicators"],
    "sentiment": ["ticker"],
    "orderflow": ["orderbook"],
    "risk": ["ticker", "ohlcv"],
}


# ─── Data fetchers with fallback ─────────────────────────────────

async def _fetch_ohlcv(symbol: str, timeframe: str = "1h", limit: int = 50) -> tuple[list, bool]:
    """Returns (data, is_synthetic)"""
    try:
        fetcher = MarketDataFetcher("binance")
        df = await fetcher.fetch_ohlcv(symbol, timeframe, limit=limit)
        await fetcher.close()
        if not df.empty:
            df["timestamp"] = df["timestamp"].astype(str)
            return df.to_dict("records"), False
    except Exception as e:
        log.warning(f"Live OHLCV fetch failed: {e}. Using synthetic data.")
    return _synthetic_ohlcv(symbol, limit), True


async def _fetch_orderbook(symbol: str) -> tuple[dict, bool]:
    """Returns (data, is_synthetic)"""
    try:
        fetcher = MarketDataFetcher("binance")
        ob = await fetcher.fetch_order_book(symbol)
        await fetcher.close()
        if ob.get("bids"):
            return ob, False
    except Exception as e:
        log.warning(f"Live orderbook fetch failed: {e}. Using synthetic data.")
    return _synthetic_orderbook(symbol), True


async def _fetch_ticker(symbol: str) -> tuple[dict, bool]:
    """Returns (data, is_synthetic)"""
    try:
        fetcher = MarketDataFetcher("binance")
        ticker = await fetcher.fetch_ticker(symbol)
        await fetcher.close()
        if ticker:
            return ticker, False
    except Exception as e:
        log.warning(f"Live ticker fetch failed: {e}. Using synthetic data.")
    return _synthetic_ticker(symbol), True


def _compute_indicators(records: list) -> dict:
    if not records:
        return {}
    df = pd.DataFrame(records)
    df["close"] = pd.to_numeric(df["close"])
    df["rsi"] = ta.momentum.RSIIndicator(df["close"], window=14).rsi()
    macd = ta.trend.MACD(df["close"])
    df["macd"] = macd.macd()
    df["macd_signal"] = macd.macd_signal()
    df["sma_50"] = ta.trend.SMAIndicator(df["close"], window=50).sma_indicator()
    latest = df.iloc[-1]
    return {
        "rsi": round(latest["rsi"], 2) if not pd.isna(latest["rsi"]) else None,
        "macd": round(latest["macd"], 4) if not pd.isna(latest["macd"]) else None,
        "macd_signal": round(latest["macd_signal"], 4) if not pd.isna(latest["macd_signal"]) else None,
        "sma_50": round(latest["sma_50"], 4) if not pd.isna(latest["sma_50"]) else None,
        "latest_close": round(latest["close"], 4),
    }


# ─── Endpoints ───────────────────────────────────────────────────

@router.get("/ohlcv/{symbol}")
async def get_ohlcv(symbol: str, timeframe: str = "1h", limit: int = 50):
    """Fetch OHLCV candles from Binance (falls back to synthetic data)."""
    data, synthetic = await _fetch_ohlcv(symbol, timeframe, limit)
    return {"symbol": symbol, "timeframe": timeframe, "count": len(data), "synthetic": synthetic, "candles": data}


@router.get("/orderbook/{symbol}")
async def get_orderbook(symbol: str):
    """Fetch order book depth from Binance (falls back to synthetic data)."""
    data, synthetic = await _fetch_orderbook(symbol)
    return {"symbol": symbol, "synthetic": synthetic, "orderbook": data}


@router.get("/ticker/{symbol}")
async def get_ticker(symbol: str):
    """Fetch 24h ticker stats from Binance (falls back to synthetic data)."""
    data, synthetic = await _fetch_ticker(symbol)
    return {
        "symbol": symbol,
        "synthetic": synthetic,
        "ticker": {
            "last": data.get("last"),
            "bid": data.get("bid"),
            "ask": data.get("ask"),
            "high": data.get("high"),
            "low": data.get("low"),
            "volume": data.get("quoteVolume"),
            "change": data.get("percentage"),
            "vwap": data.get("vwap"),
        }
    }


@router.get("/agent-data/{agent_name}/{symbol}")
async def get_agent_data(agent_name: str, symbol: str, timeframe: str = "1h"):
    """Fetch Binance data specific to a given agent's needs."""
    agent_key = agent_name.lower().replace(" ", "").replace("_", "")
    needed = AGENT_DATA_MAP.get(agent_key)
    if not needed:
        raise HTTPException(status_code=404, detail=f"Unknown agent: {agent_name}. Valid: {list(AGENT_DATA_MAP.keys())}")

    result: Dict[str, Any] = {"agent": agent_name, "symbol": symbol, "synthetic": False}

    if "ohlcv" in needed:
        ohlcv, syn = await _fetch_ohlcv(symbol, timeframe, limit=50)
        result["ohlcv"] = ohlcv
        if syn:
            result["synthetic"] = True
        if "indicators" in needed and ohlcv:
            result["indicators"] = _compute_indicators(ohlcv)

    if "orderbook" in needed:
        ob, syn = await _fetch_orderbook(symbol)
        result["orderbook"] = ob
        if syn:
            result["synthetic"] = True

    if "ticker" in needed:
        ticker_raw, syn = await _fetch_ticker(symbol)
        result["ticker"] = {
            "last": ticker_raw.get("last"),
            "bid": ticker_raw.get("bid"),
            "ask": ticker_raw.get("ask"),
            "high": ticker_raw.get("high"),
            "low": ticker_raw.get("low"),
            "volume": ticker_raw.get("quoteVolume"),
            "change": ticker_raw.get("percentage"),
        }
        if syn:
            result["synthetic"] = True

    return result


@router.post("/ai-fetch/{symbol}")
async def ai_fetch(symbol: str, body: Optional[AIFetchRequest] = None):
    """
    AI-initiated fetch: Gemini analyzes raw Binance data and returns
    enriched insights. Falls back to synthetic data + pre-built insight if LLM is unavailable.
    """
    timeframe = body.timeframe if body else "1h"
    limit = body.limit if body else 50

    # Fetch all data types (with fallback)
    ohlcv, ohlcv_syn = await _fetch_ohlcv(symbol, timeframe, limit)
    ticker_raw, ticker_syn = await _fetch_ticker(symbol)
    orderbook, ob_syn = await _fetch_orderbook(symbol)
    indicators = _compute_indicators(ohlcv) if ohlcv else {}
    is_synthetic = ohlcv_syn or ticker_syn or ob_syn

    # Build data summary for AI
    latest_candles = ohlcv[-5:] if ohlcv else []
    top_bids = orderbook.get("bids", [])[:5]
    top_asks = orderbook.get("asks", [])[:5]

    data_summary = f"""Symbol: {symbol}
Timeframe: {timeframe}
Latest Price: {ticker_raw.get('last', 'N/A')}
24h Change: {ticker_raw.get('percentage', 'N/A')}%
24h High: {ticker_raw.get('high', 'N/A')}
24h Low: {ticker_raw.get('low', 'N/A')}

Indicators:
RSI(14): {indicators.get('rsi', 'N/A')}
MACD: {indicators.get('macd', 'N/A')}
MACD Signal: {indicators.get('macd_signal', 'N/A')}
SMA(50): {indicators.get('sma_50', 'N/A')}

Recent Candles: {latest_candles}

Top 5 Bids: {top_bids}
Top 5 Asks: {top_asks}"""

    # Try LLM analysis
    try:
        llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash", temperature=0)
        structured_llm = llm.with_structured_output(AIInsight)

        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are a professional market data analyst AI. Analyze the raw Binance market data provided and produce a concise insight. Be specific with numbers."),
            ("human", "{data}")
        ])

        chain = prompt | structured_llm
        insight: AIInsight = await chain.ainvoke({"data": data_summary})
        ai_result = {
            "summary": insight.summary,
            "key_levels": insight.key_levels,
            "trend": insight.trend,
            "recommendation": insight.recommendation,
        }
    except Exception as e:
        log.warning(f"AI Fetch LLM error: {e}. Using rule-based fallback.")
        # Rule-based fallback when LLM is unavailable
        rsi = indicators.get("rsi")
        price = ticker_raw.get("last", 0)
        change = ticker_raw.get("percentage", 0)
        sma = indicators.get("sma_50")

        if rsi and rsi > 70:
            trend = "BEARISH"
            rec = f"RSI at {rsi:.1f} indicates overbought conditions. Consider taking profits."
        elif rsi and rsi < 30:
            trend = "BULLISH"
            rec = f"RSI at {rsi:.1f} indicates oversold conditions. Potential buying opportunity."
        elif change and change > 1.5:
            trend = "BULLISH"
            rec = f"Strong positive momentum with {change:.1f}% gain."
        elif change and change < -1.5:
            trend = "BEARISH"
            rec = f"Negative momentum with {change:.1f}% decline."
        else:
            trend = "SIDEWAYS"
            rec = "Market is consolidating. Wait for a clear breakout."

        ai_result = {
            "summary": f"{symbol} is trading at ${price:,.2f} with a {change:+.2f}% change. {'(Synthetic data)' if is_synthetic else ''}",
            "key_levels": f"Support: ${price * 0.97:,.2f} | Resistance: ${price * 1.03:,.2f}" + (f" | SMA(50): ${sma:,.2f}" if sma else ""),
            "trend": trend,
            "recommendation": rec,
        }

    return {
        "symbol": symbol,
        "synthetic": is_synthetic,
        "raw_data": {
            "ticker": {
                "last": ticker_raw.get("last"),
                "high": ticker_raw.get("high"),
                "low": ticker_raw.get("low"),
                "change": ticker_raw.get("percentage"),
                "volume": ticker_raw.get("quoteVolume"),
            },
            "indicators": indicators,
            "ohlcv_count": len(ohlcv),
            "orderbook_depth": {
                "bids": len(orderbook.get("bids", [])),
                "asks": len(orderbook.get("asks", [])),
            }
        },
        "ai_insight": ai_result,
    }
