from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from core.database import Base

class Strategy(Base):
    __tablename__ = "strategies"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String)
    
    # Evolution parameters (e.g. JSON string or separate columns)
    parameters = Column(String) 
    
    # Performance metrics
    total_trades = Column(Integer, default=0)
    profit = Column(Float, default=0.0)
    win_rate = Column(Float, default=0.0)
    sharpe_ratio = Column(Float, default=0.0)
    max_drawdown = Column(Float, default=0.0)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    trades = relationship("Trade", back_populates="strategy")

class Agent(Base):
    __tablename__ = "agents"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    role = Column(String)  # technical, sentiment, flow, risk, decision
    description = Column(String)
    
    # Track overall success of this agent's signals
    success_rate = Column(Float, default=0.0)

class Trade(Base):
    __tablename__ = "trades"
    
    id = Column(Integer, primary_key=True, index=True)
    strategy_id = Column(Integer, ForeignKey("strategies.id"))
    
    symbol = Column(String, index=True)
    action = Column(String) # BUY, SELL
    
    # Execution details
    entry_price = Column(Float)
    exit_price = Column(Float, nullable=True)
    stop_loss = Column(Float)
    take_profit = Column(Float)
    
    # Performance outcome
    pnl = Column(Float, nullable=True)
    status = Column(String, default="OPEN") # OPEN, CLOSED
    is_paper_trade = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    closed_at = Column(DateTime, nullable=True)
    
    # Link back to strategy
    strategy = relationship("Strategy", back_populates="trades")
