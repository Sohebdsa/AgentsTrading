from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.encoders import jsonable_encoder
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import logging

log = logging.getLogger("trading")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

from core.database import get_db
from models.models import Trade, Strategy, Agent
from graph.pipeline import build_trading_graph, RoutingState
from typing import Dict, Any
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver
from langgraph.types import Command
from pydantic import BaseModel
from execution.executor import ExecutionEngine

router = APIRouter()

class ResolutionRequest(BaseModel):
    action: str  # "approve" or "reject"

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
    
    print(f"Triggering pipeline for {symbol}...")
    
    async with AsyncSqliteSaver.from_conn_string("./trading_checkpoints.db") as checkpointer:
        graph = build_trading_graph(checkpointer=checkpointer)
        config = {"configurable": {"thread_id": f"trade_thread_{symbol}_{timeframe}"}}
        
        snapshot = await graph.aget_state(config)
        
        if snapshot.next and "HumanApproval" in snapshot.next:
            print(f"Graph is currently paused waiting for human approval for {symbol}")
            return {"status": "paused", "message": "Waiting for human approval on the dashboard.", "decision": snapshot.values.get("final_decision")}
            
        final_state = await graph.ainvoke(initial_state, config=config)
        
        next_nodes = (await graph.aget_state(config)).next or []
        return {
            "symbol": final_state["symbol"],
            "agents": final_state["signals"],
            "decision": final_state["final_decision"],
            "execution": final_state["execution_details"],
            "status": "completed" if "HumanApproval" not in next_nodes else "interrupted_pausing_for_human"
        }


@router.websocket("/ws/signals/{symbol}")
async def websocket_signals(websocket: WebSocket, symbol: str, timeframe: str = '1h'):
    log.info(f"[WS] New connection request for symbol={symbol} timeframe={timeframe}")
    await websocket.accept()
    log.info(f"[WS] Connection accepted for {symbol}")
    
    initial_state = RoutingState(
        symbol=symbol,
        timeframe=timeframe,
        market_data={},
        signals=[],
        final_decision=None,
        execution_details=None,
        trade_history=[]
    )
    
    async with AsyncSqliteSaver.from_conn_string("./trading_checkpoints.db") as checkpointer:
        graph = build_trading_graph(checkpointer=checkpointer)
        config = {"configurable": {"thread_id": f"trade_thread_{symbol}_{timeframe}"}}
        
        # Check if already paused at human approval
        snapshot = await graph.aget_state(config)
        if snapshot.next and "HumanApproval" in snapshot.next:
            log.info(f"[WS] Graph already paused at HumanApproval for {symbol}")
            await websocket.send_json({"type": "paused", "decision": snapshot.values.get("final_decision")})
            await websocket.close()
            return

        try:
            # Announce MarketData node starting
            log.info(f"[WS] Starting graph stream for {symbol}")
            await websocket.send_json({"type": "node_start", "node": "MarketData"})

            async for state_update in graph.astream(initial_state, config, stream_mode="updates"):
                # state_update == {node_name: that_node's_output_dict}
                for node_name, node_output in state_update.items():

                    # Skip LangGraph internal nodes
                    if node_name.startswith("__"):
                        log.debug(f"[WS] Skipping internal node: {node_name}")
                        continue

                    log.info(f"[WS] Node completed: {node_name}")

                    if node_name == "MarketData":
                        await websocket.send_json({
                            "type": "node_complete",
                            "node": "MarketData",
                            "data": {"message": "Live market data fetched successfully."}
                        })
                        # Announce all 4 analysis agents starting in parallel
                        for agent in ["TechnicalAgent", "SentimentAgent", "OrderFlowAgent", "RiskAgent"]:
                            await websocket.send_json({"type": "node_start", "node": agent})

                    elif node_name in ("TechnicalAgent", "SentimentAgent", "OrderFlowAgent", "RiskAgent"):
                        signals = node_output.get("signals", [])
                        signal = signals[-1] if signals else None
                        await websocket.send_json({
                            "type": "node_complete",
                            "node": node_name,
                            "data": {
                                "agent_name": signal["agent_name"] if signal else node_name.replace("Agent", ""),
                                "signal":     signal["signal"] if signal else "WAIT",
                                "confidence": signal["confidence"] if signal else 0,
                                "reasoning":  signal["reasoning"] if signal else "No output.",
                                "entry":      signal.get("suggested_entry") if signal else None,
                                "stop_loss":  signal.get("stop_loss") if signal else None,
                                "take_profit":signal.get("take_profit") if signal else None,
                            }
                        })

                    elif node_name == "DecisionAgent":
                        await websocket.send_json({"type": "node_start", "node": "DecisionAgent"})
                        final_decision = node_output.get("final_decision")
                        execution_details = node_output.get("execution_details")
                        await websocket.send_json({
                            "type": "decision",
                            "node": "DecisionAgent",
                            "data": {
                                "final_decision": final_decision,
                                "details": execution_details
                            }
                        })

            # Check final graph state for human interrupt
            snapshot = await graph.aget_state(config)
            if snapshot.next and "HumanApproval" in snapshot.next:
                await websocket.send_json({"type": "paused", "decision": snapshot.values.get("final_decision")})
            else:
                await websocket.send_json({"type": "completed"})
                
        except Exception as e:
            print(f"WebSocket Graph Error: {e}")
            import traceback; traceback.print_exc()
            await websocket.send_json({"type": "error", "message": str(e)})


@router.post("/signals/{symbol}/resolve")
async def resolve_human_approval(symbol: str, request: ResolutionRequest, timeframe: str = '1h', db: AsyncSession = Depends(get_db)):
    """Resumes the graph execution after human review."""
    async with AsyncSqliteSaver.from_conn_string("./trading_checkpoints.db") as checkpointer:
        graph = build_trading_graph(checkpointer=checkpointer)
        config = {"configurable": {"thread_id": f"trade_thread_{symbol}_{timeframe}"}}
        
        snapshot = await graph.aget_state(config)
        if not snapshot.next or "HumanApproval" not in snapshot.next:
            return {"error": "Graph is not currently waiting for human approval."}
            
        print(f"Resuming graph for {symbol} with action: {request.action}")
        
        # Resume graph
        final_state = await graph.ainvoke(Command(resume=request.action), config=config)
        
        decision = final_state.get("final_decision", "UNKNOWN") if isinstance(final_state, dict) else "UNKNOWN"
        execution_details = final_state.get("execution_details") if isinstance(final_state, dict) else None
        
        # If approved, hit the execution engine
        if request.action == "approve" and decision in ["BUY", "SELL"]:
            engine = ExecutionEngine(db)
            strategy_id = 1  # default paper trading strategy
            await engine.execute_trade(strategy_id, symbol, decision, execution_details)
            print(f"Executed paper trade for {symbol}: {decision}")

        return {
            "status": "resolved",
            "action": request.action,
            "decision": decision
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
