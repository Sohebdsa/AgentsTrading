from typing import Dict, Any, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from models.models import Trade, Strategy

class ExecutionEngine:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def execute_trade(self, strategy_id: int, symbol: str, signal: str, details: Dict[str, Any] | None) -> Trade | None:
        """
        Executes a paper-trade based on the aggregated decision agent's output.
        Returns the created Trade ORM object.
        """
        if signal not in ["BUY", "SELL"] or not details:
            print(f"Skipping execution. Signal is {signal}.")
            return None
            
        print(f"Executing PAPER TRADE: {signal} {symbol}...")
        
        # In a real system, you'd call CCXT create_order here for LIVE trading.
        # For Paper trading, we just record the expected entry/stop/take limits
        
        entry = details.get("avg_entry")
        stop = details.get("avg_stop_loss")
        take = details.get("avg_take_profit")
        
        trade = Trade(
            strategy_id=strategy_id,
            symbol=symbol,
            action=signal,
            entry_price=entry,
            stop_loss=stop,
            take_profit=take,
            status="OPEN",
            is_paper_trade=True
        )
        
        self.session.add(trade)
        await self.session.commit()
        await self.session.refresh(trade)
        
        print(f"Registered Trade ID {trade.id} in DB.")
        return trade
