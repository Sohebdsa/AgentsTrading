import os
from dotenv import load_dotenv
load_dotenv()  # Load .env before anything else

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from core.database import engine, Base
from api.routes import trading, binance_data

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB schema on startup
    async with engine.begin() as conn:
        print("Creating database tables...")
        await conn.run_sync(Base.metadata.create_all)
        
    yield
    # Shutdown
    await engine.dispose()

app = FastAPI(
    title="AI Multi-Agent Trading System",
    description="Python + LangGraph + FastAPI backend for autonomous trading operations",
    version="1.0.0",
    lifespan=lifespan
)

# Allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(trading.router, prefix="/api/v1")
app.include_router(binance_data.router, prefix="/api/v1")

@app.get("/")
async def root():
    return {"status": "ok", "message": "AgentsTrading Backend is running."}

# To run:
# uvicorn main:app --reload --host 0.0.0.0 --port 8000
