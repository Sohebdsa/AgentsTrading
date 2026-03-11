from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from core.database import get_db
from models.models import Trade, Strategy, Agent
from graph.pipeline import build_trading_graph, RoutingState
from typing import Dict, Any

router = APIRouter()
graph = build_trading_graph()

@router.get("/signals/{symbol}")
async def get_latest_signals(symbol: str, timeframe: str = '1h', db: AsyncSession = Depends(get_db)):
    """
    Triggers the LangGraph multi-agent pipeline for a single symbol
    and returns the agents' outputs and the final decision.
    """
    initial_state = RoutingState(
        symbol=symbol,
        timeframe=timeframe,
        market_data={},
        signals=[],
        final_decision=None,
        execution_details=None,
        trade_history=[]
    )
    
    # Run the graph
    print(f"Triggering pipeline for {symbol}...")
    final_state = await graph.ainvoke(initial_state)
    
    return {
        "symbol": final_state["symbol"],
        "agents": final_state["signals"],
        "decision": final_state["final_decision"],
        "execution": final_state["execution_details"]
    }

@router.get("/leaderboard")
async def get_strategy_leaderboard(db: AsyncSession = Depends(get_db)):
    """Returns the performance metrics for all competing strategies."""
    result = await db.execute(select(Strategy).order_by(Strategy.profit.desc()))
    strategies = result.scalars().all()
    
    return {
        "leaderboard": [
            {
                "id": s.id,
                "name": s.name,
                "profit": s.profit,
                "win_rate": s.win_rate,
                "trades": s.total_trades,
                "active": s.is_active
            }
            for s in strategies
        ]
    }

@router.get("/trades")
async def get_trade_history(limit: int = 50, db: AsyncSession = Depends(get_db)):
    """Returns recent paper trades or live executions."""
    result = await db.execute(select(Trade).order_by(Trade.created_at.desc()).limit(limit))
    trades = result.scalars().all()
    
    return {
        "trades": [
            {
                "id": t.id,
                "symbol": t.symbol,
                "action": t.action,
                "pnl": t.pnl,
                "status": t.status,
                "created_at": t.created_at
            }
            for t in trades
        ]
    }
