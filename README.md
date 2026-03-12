<div align="center">
  <img src="frontend/public/vite.svg" alt="CubeXAgents Logo" width="80" height="80">
  <h1 align="center">CubeXAgents</h1>
  <p align="center">
    <strong>Autonomous, Multi-Agent AI Trading System</strong>
  </p>
  <p align="center">
    A sophisticated algorithmic trading platform powered by LLM agent swarms, LangGraph, FastAPI, and React.
  </p>
</div>

---

## ⚡ Overview

CubeXAgents is a state-of-the-art autonomous trading system built on a multi-agent architecture. Instead of relying entirely on static code heuristics, the platform uses an interconnected network of specialized Large Language Model (LLM) agents (Technical Analysis, Sentiment Analysis, Order Flow, and Risk Management). These agents process live market data in parallel and pass their independent findings to a master Decision Aggregation agent.

The system is fully observable through a professional, Bloomberg-terminal-inspired React dashboard, allowing users to watch agents debate, vote, and execute live or paper trades in real-time.

![CubeXAgents Dashboard Demo](previews/dashboard_placeholder.png)
*(Screenshot: Main Dashboard showcasing live AI agent decisions and market charts)*

## ✨ Architecture & Features

### The Multi-Agent Swarm (LangGraph + OpenAI)
- **🧠 Technical Analysis Agent**: Analyzes OHLCV, RSI, MACD, and SMA trends.
- **📰 Sentiment Analysis Agent**: Scans pseudo-market news and sentiment data for momentum.
- **📊 Order Flow Agent**: Processes order book depth, bids, and ask walls.
- **🛡️ Risk Management Agent**: Calculates position sizing, stop-loss, and take-profit ratios.
- **⚖️ Decision Aggregation Agent**: Acts as the master orchestrator, synthesizing competing reports into a final consensus trade (BUY, SELL, WAIT).

### Human-in-the-Loop Operations
The pipeline natively supports a Human-in-the-loop (HITL) architecture. The execution pauses after the master decision agent formulates a trade plan, sending a WebSocket pulse to the frontend for human approval. Upon approval (or rejection), the LangGraph memory state resumes seamlessly.

![Agents Workspace](previews/agents_workspace_placeholder.png)
*(Screenshot: The Agents Workspace showing real-time agent processing and the human approval modal)*

### Technical Stack
- **Backend Core**: Python 3.10+, FastAPI, Uvicorn
- **AI Agent Orchestration**: LangChain, LangGraph, OpenAI (`gpt-4o-mini`)
- **Real-Time Data**: CCXT (Binance integration), WebSocket streams
- **Frontend Core**: React 18, Vite, TypeScript
- **UI & Styling**: Pure vanilla CSS styled to match deep-slate institutional trading terminals. Charts powered by TradingView widget.
- **Database**: SQLite (via `aiosqlite` and SQLAlchemy) for trade history and LangGraph state continuity.

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Python 3.10+
- A valid OpenAI API Key

### 1. Backend Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/AgentsTrading.git
cd AgentsTrading/backend

# Create and activate a Virtual Environment
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure Environment
# Rename .env.example to .env and add your OpenAI Key:
echo "OPENAI_API_KEY=your_openai_api_key_here" > .env
echo "DATABASE_URL=sqlite+aiosqlite:///./trading.db" >> .env

# Run the FastAPI Server
uvicorn main:app --host 0.0.0.0 --port 8000 --env-file .env
```
*(The backend runs on `http://localhost:8000`)*

### 2. Frontend Setup

```bash
# Open a new terminal tab
cd AgentsTrading/frontend

# Install dependencies
npm install

# Start the Vite development server
npm run dev
```
*(The frontend runs on `http://localhost:5173`)*

## 📸 Interface Screenshots

| Trade History Terminal | Agent Live Reasoning |
| :---: | :---: |
| ![Trade History](previews/trade_history_placeholder.png) | ![Agent Reasoning](previews/agent_reasoning_placeholder.png) |
| *Log of all executed paper trades, showing PnL, Win Rates, and trade durations.* | *The slide-out panel detailing exact LLM reasoning, signal confidence, and consensus levels.* |

## 🧩 Pipeline Lifecycle

1. **Market Data Fetching**: System connects to CCXT (with a synthetic data fallback mechanism for geo-blocked regions).
2. **Parallel Agent Execution**: Data is distributed to the 4 analysis agents via LangGraph.
3. **Synthesis**: The Decision Agent combines the structured output.
4. **Pause & Notify**: Graph state writes to SQLite memory; WebSocket notifies the React UI that human approval is required.
5. **Execution**: Frontend POST request resumes the graph to execute (or discard) the trade in the Paper Trading SQLite ledger.

---

<p align="center">
  Built by V3nom with ❤️ for algorithmic traders and AI enthusiasts.
</p>
