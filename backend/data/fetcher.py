import ccxt.async_support as ccxt
import pandas as pd
from typing import Dict, Any, List

class MarketDataFetcher:
    def __init__(self, exchange_id: str = 'binance'):
        # Initialize CCXT exchange dynamically
        exchange_class = getattr(ccxt, exchange_id)
        self.exchange = exchange_class({
            'enableRateLimit': True,
        })
        
    async def fetch_ohlcv(self, symbol: str, timeframe: str = '1h', limit: int = 100) -> pd.DataFrame:
        """Fetch historical candlestick data and return as a pandas DataFrame."""
        try:
            bars = await self.exchange.fetch_ohlcv(symbol, timeframe, limit=limit)
            df = pd.DataFrame(bars, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
            df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
            return df
        except Exception as e:
            print(f"Error fetching OHLCV for {symbol}: {e}")
            return pd.DataFrame()

    async def fetch_order_book(self, symbol: str, limit: int = 20) -> Dict[str, Any]:
        """Fetch current order book depth (bids and asks)."""
        try:
            orderbook = await self.exchange.fetch_order_book(symbol, limit)
            return {
                "bids": orderbook['bids'],
                "asks": orderbook['asks']
            }
        except Exception as e:
            print(f"Error fetching orderbook for {symbol}: {e}")
            return {"bids": [], "asks": []}

    async def fetch_ticker(self, symbol: str) -> Dict[str, Any]:
        """Fetch current price and 24h stats."""
        try:
            return await self.exchange.fetch_ticker(symbol)
        except Exception as e:
            print(f"Error fetching ticker for {symbol}: {e}")
            return {}
            
    async def close(self):
        """Close the async exchange session."""
        await self.exchange.close()
