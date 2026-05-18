import { useState, useCallback } from 'react';
import Layout from '../../layout/Layout';
import './DataExplorerPage.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API = `${API_BASE}/api/v1/binance`;

type FetchStatus = 'idle' | 'fetching' | 'done' | 'error';
type AgentKey = 'technical' | 'sentiment' | 'orderflow' | 'risk';
type ViewTab = 'ticker' | 'ohlcv' | 'orderbook' | 'indicators' | 'ai';

interface TickerData {
  last: number | null;
  bid: number | null;
  ask: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
  change: number | null;
  vwap?: number | null;
}

interface IndicatorsData {
  rsi: number | null;
  macd: number | null;
  macd_signal: number | null;
  sma_50: number | null;
  latest_close: number | null;
}

interface OhlcvCandle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface OrderbookData {
  bids: [number, number][];
  asks: [number, number][];
}

interface AIInsight {
  summary: string;
  key_levels: string;
  trend: string;
  recommendation: string;
}

interface FetchState {
  ticker: FetchStatus;
  ohlcv: FetchStatus;
  orderbook: FetchStatus;
  indicators: FetchStatus;
  ai: FetchStatus;
}

const AGENTS: { key: AgentKey; label: string }[] = [
  { key: 'technical', label: 'Technical Analysis' },
  { key: 'sentiment', label: 'Sentiment Analysis' },
  { key: 'orderflow', label: 'Order Flow' },
  { key: 'risk', label: 'Risk Management' },
];

const STATUS_LABELS: Record<string, string> = {
  ticker: 'Ticker',
  ohlcv: 'OHLCV',
  orderbook: 'Orderbook',
  indicators: 'Indicators',
  ai: 'AI Insight',
};

// ─── Helper components ──────────────────────────────────────

const StatusIcon = ({ status }: { status: FetchStatus }) => {
  if (status === 'fetching') return <div className="dex-spinner" />;
  if (status === 'done') return (
    <svg className="dex-tick" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
  if (status === 'error') return <span className="dex-error-icon">✕</span>;
  return <div className="dex-idle-dot" />;
};

const fmt = (v: number | null | undefined, decimals = 2) =>
  v != null ? Number(v).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : '—';

// ─── Main component ─────────────────────────────────────────

export default function DataExplorerPage() {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [selectedAgent, setSelectedAgent] = useState<AgentKey>('technical');
  const [viewTab, setViewTab] = useState<ViewTab>('ticker');

  const [fetchState, setFetchState] = useState<FetchState>({
    ticker: 'idle', ohlcv: 'idle', orderbook: 'idle', indicators: 'idle', ai: 'idle',
  });

  const [ticker, setTicker] = useState<TickerData | null>(null);
  const [ohlcv, setOhlcv] = useState<OhlcvCandle[]>([]);
  const [orderbook, setOrderbook] = useState<OrderbookData | null>(null);
  const [indicators, setIndicators] = useState<IndicatorsData | null>(null);
  const [aiInsight, setAiInsight] = useState<AIInsight | null>(null);

  const isFetching = Object.values(fetchState).some(s => s === 'fetching');

  const setStatus = (key: keyof FetchState, status: FetchStatus) =>
    setFetchState(prev => ({ ...prev, [key]: status }));

  // Fetch agent-specific data
  const fetchAgentData = useCallback(async () => {
    // Reset
    setTicker(null); setOhlcv([]); setOrderbook(null); setIndicators(null); setAiInsight(null);
    setFetchState({ ticker: 'idle', ohlcv: 'idle', orderbook: 'idle', indicators: 'idle', ai: 'idle' });

    const sym = symbol.replace('/', '_');

    // Fetch agent-specific endpoint
    setStatus('ticker', 'fetching');
    setStatus('ohlcv', 'fetching');
    setStatus('orderbook', 'fetching');
    setStatus('indicators', 'fetching');

    try {
      const res = await fetch(`${API}/agent-data/${selectedAgent}/${sym}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // Ticker
      if (data.ticker) {
        setTicker(data.ticker);
        setStatus('ticker', 'done');
      } else {
        setStatus('ticker', 'idle');
      }

      // OHLCV
      if (data.ohlcv && data.ohlcv.length > 0) {
        setOhlcv(data.ohlcv);
        setStatus('ohlcv', 'done');
      } else {
        setStatus('ohlcv', 'idle');
      }

      // Orderbook
      if (data.orderbook && (data.orderbook.bids?.length || data.orderbook.asks?.length)) {
        setOrderbook(data.orderbook);
        setStatus('orderbook', 'done');
      } else {
        setStatus('orderbook', 'idle');
      }

      // Indicators
      if (data.indicators) {
        setIndicators(data.indicators);
        setStatus('indicators', 'done');
      } else {
        setStatus('indicators', 'idle');
      }

    } catch (err) {
      console.error('Fetch error:', err);
      setStatus('ticker', 'error');
      setStatus('ohlcv', 'error');
      setStatus('orderbook', 'error');
      setStatus('indicators', 'error');
    }
  }, [symbol, selectedAgent]);

  // AI-initiated fetch
  const fetchAIData = useCallback(async () => {
    setAiInsight(null);
    setStatus('ai', 'fetching');
    // Also fetch raw data for display
    setStatus('ticker', 'fetching');
    setStatus('indicators', 'fetching');

    const sym = symbol.replace('/', '_');

    try {
      const res = await fetch(`${API}/ai-fetch/${sym}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeframe: '1h', limit: 50 }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // AI insight
      if (data.ai_insight) {
        setAiInsight(data.ai_insight);
        setStatus('ai', 'done');
      } else {
        setStatus('ai', 'error');
      }

      // Raw data
      if (data.raw_data?.ticker) {
        setTicker(data.raw_data.ticker);
        setStatus('ticker', 'done');
      } else {
        setStatus('ticker', 'idle');
      }

      if (data.raw_data?.indicators) {
        setIndicators(data.raw_data.indicators);
        setStatus('indicators', 'done');
      } else {
        setStatus('indicators', 'idle');
      }

      setViewTab('ai');
    } catch (err) {
      console.error('AI Fetch error:', err);
      setStatus('ai', 'error');
      setStatus('ticker', 'error');
      setStatus('indicators', 'error');
    }
  }, [symbol]);

  // ─── Available tabs based on fetched data ──────────────────

  const availableTabs: ViewTab[] = [];
  if (ticker) availableTabs.push('ticker');
  if (indicators) availableTabs.push('indicators');
  if (ohlcv.length > 0) availableTabs.push('ohlcv');
  if (orderbook) availableTabs.push('orderbook');
  if (aiInsight) availableTabs.push('ai');

  return (
    <Layout>
      <div className="dex-page">
        {/* Header */}
        <header className="dex-header">
          <h1>Agent Data Explorer</h1>
          <div className="dex-controls">
            <input
              type="text"
              className="dex-input"
              value={symbol}
              onChange={e => setSymbol(e.target.value.toUpperCase())}
              placeholder="e.g. BTCUSDT"
            />
            <select
              className="dex-select"
              value={selectedAgent}
              onChange={e => setSelectedAgent(e.target.value as AgentKey)}
            >
              {AGENTS.map(a => (
                <option key={a.key} value={a.key}>{a.label}</option>
              ))}
            </select>
            <button className="dex-btn" onClick={fetchAgentData} disabled={isFetching}>
              {isFetching ? 'Fetching…' : 'Fetch Data'}
            </button>
            <button className="dex-btn dex-btn--ai" onClick={fetchAIData} disabled={isFetching}>
              {isFetching ? 'Fetching…' : '🤖 AI Fetch'}
            </button>
          </div>
        </header>

        {/* Status strip */}
        <div className="dex-status-strip">
          {(Object.keys(STATUS_LABELS) as (keyof FetchState)[]).map(key => (
            <div key={key} className={`dex-status-item ${fetchState[key]}`}>
              <StatusIcon status={fetchState[key]} />
              <span>{STATUS_LABELS[key]}</span>
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="dex-content">
          {availableTabs.length === 0 ? (
            <div className="dex-empty">
              <div className="dex-empty-icon">📊</div>
              <span>Select an agent and click "Fetch Data" or "AI Fetch" to load Binance data</span>
            </div>
          ) : (
            <>
              {/* View tab selector */}
              {availableTabs.length > 1 && (
                <select
                  className="dex-view-select"
                  value={viewTab}
                  onChange={e => setViewTab(e.target.value as ViewTab)}
                >
                  {availableTabs.map(t => (
                    <option key={t} value={t}>{STATUS_LABELS[t]}</option>
                  ))}
                </select>
              )}

              {/* Ticker */}
              {viewTab === 'ticker' && ticker && (
                <div className="dex-card">
                  <div className="dex-card-header">
                    <h3 className="dex-card-title">24h Ticker — {symbol}</h3>
                    {ticker.change != null && (
                      <span className={`dex-card-badge ${ticker.change >= 0 ? 'bullish' : 'bearish'}`}>
                        {ticker.change >= 0 ? '+' : ''}{fmt(ticker.change)}%
                      </span>
                    )}
                  </div>
                  <div className="dex-card-body">
                    <div className="dex-ticker-grid">
                      <div className="dex-ticker-stat">
                        <span className="label">Last Price</span>
                        <span className="value">${fmt(ticker.last, 4)}</span>
                      </div>
                      <div className="dex-ticker-stat">
                        <span className="label">24h High</span>
                        <span className="value">${fmt(ticker.high, 4)}</span>
                      </div>
                      <div className="dex-ticker-stat">
                        <span className="label">24h Low</span>
                        <span className="value">${fmt(ticker.low, 4)}</span>
                      </div>
                      <div className="dex-ticker-stat">
                        <span className="label">Volume</span>
                        <span className="value">${fmt(ticker.volume, 0)}</span>
                      </div>
                      <div className="dex-ticker-stat">
                        <span className="label">Bid</span>
                        <span className="value">${fmt(ticker.bid, 4)}</span>
                      </div>
                      <div className="dex-ticker-stat">
                        <span className="label">Ask</span>
                        <span className="value">${fmt(ticker.ask, 4)}</span>
                      </div>
                      <div className="dex-ticker-stat">
                        <span className="label">24h Change</span>
                        <span className={`value ${(ticker.change ?? 0) >= 0 ? 'positive' : 'negative'}`}>
                          {ticker.change != null ? `${ticker.change >= 0 ? '+' : ''}${fmt(ticker.change)}%` : '—'}
                        </span>
                      </div>
                      <div className="dex-ticker-stat">
                        <span className="label">Spread</span>
                        <span className="value">
                          {ticker.bid != null && ticker.ask != null ? `$${fmt(ticker.ask - ticker.bid, 4)}` : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Indicators */}
              {viewTab === 'indicators' && indicators && (
                <div className="dex-card">
                  <div className="dex-card-header">
                    <h3 className="dex-card-title">Technical Indicators</h3>
                  </div>
                  <div className="dex-card-body">
                    <div className="dex-indicators-grid">
                      <div className="dex-indicator">
                        <span className="label">RSI (14)</span>
                        <span className="value">{indicators.rsi ?? '—'}</span>
                      </div>
                      <div className="dex-indicator">
                        <span className="label">MACD</span>
                        <span className="value">{indicators.macd ?? '—'}</span>
                      </div>
                      <div className="dex-indicator">
                        <span className="label">MACD Signal</span>
                        <span className="value">{indicators.macd_signal ?? '—'}</span>
                      </div>
                      <div className="dex-indicator">
                        <span className="label">SMA (50)</span>
                        <span className="value">{indicators.sma_50 != null ? `$${fmt(indicators.sma_50, 4)}` : '—'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* OHLCV Table */}
              {viewTab === 'ohlcv' && ohlcv.length > 0 && (
                <div className="dex-card">
                  <div className="dex-card-header">
                    <h3 className="dex-card-title">OHLCV Candles ({ohlcv.length})</h3>
                  </div>
                  <div className="dex-card-body">
                    <div className="dex-table-wrap">
                      <table className="dex-table">
                        <thead>
                          <tr>
                            <th>Time</th>
                            <th>Open</th>
                            <th>High</th>
                            <th>Low</th>
                            <th>Close</th>
                            <th>Volume</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ohlcv.slice().reverse().map((c, i) => (
                            <tr key={i}>
                              <td>{new Date(c.timestamp).toLocaleTimeString()}</td>
                              <td>${fmt(c.open, 2)}</td>
                              <td>${fmt(c.high, 2)}</td>
                              <td>${fmt(c.low, 2)}</td>
                              <td style={{ color: c.close >= c.open ? 'var(--buy)' : 'var(--sell)' }}>
                                ${fmt(c.close, 2)}
                              </td>
                              <td>{fmt(c.volume, 0)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Orderbook */}
              {viewTab === 'orderbook' && orderbook && (
                <div className="dex-card">
                  <div className="dex-card-header">
                    <h3 className="dex-card-title">Order Book Depth</h3>
                  </div>
                  <div className="dex-card-body">
                    <div className="dex-orderbook-grid">
                      <div className="dex-ob-side bids">
                        <h4>Bids (Buyers)</h4>
                        {orderbook.bids.slice(0, 10).map(([price, size], i) => (
                          <div key={i} className="dex-ob-row">
                            <span className="price">${fmt(price, 2)}</span>
                            <span className="size">{fmt(size, 4)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="dex-ob-side asks">
                        <h4>Asks (Sellers)</h4>
                        {orderbook.asks.slice(0, 10).map(([price, size], i) => (
                          <div key={i} className="dex-ob-row">
                            <span className="price">${fmt(price, 2)}</span>
                            <span className="size">{fmt(size, 4)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Insight */}
              {viewTab === 'ai' && aiInsight && (
                <div className="dex-card dex-ai-card">
                  <div className="dex-card-header">
                    <h3 className="dex-card-title">🤖 AI Market Insight</h3>
                    <span className={`dex-card-badge ${aiInsight.trend === 'BULLISH' ? 'bullish' :
                        aiInsight.trend === 'BEARISH' ? 'bearish' : 'neutral'
                      }`}>
                      {aiInsight.trend}
                    </span>
                  </div>
                  <div className="dex-card-body">
                    <div className="dex-ai-insight-grid">
                      <div className="dex-ai-row">
                        <span className="label">Summary</span>
                        <span className="value">{aiInsight.summary}</span>
                      </div>
                      <div className="dex-ai-row">
                        <span className="label">Key Levels</span>
                        <span className="value">{aiInsight.key_levels}</span>
                      </div>
                      <div className="dex-ai-row">
                        <span className="label">Trend</span>
                        <span className={`value trend-tag ${aiInsight.trend}`}>{aiInsight.trend}</span>
                      </div>
                      <div className="dex-ai-row">
                        <span className="label">Recommendation</span>
                        <span className="value">{aiInsight.recommendation}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
