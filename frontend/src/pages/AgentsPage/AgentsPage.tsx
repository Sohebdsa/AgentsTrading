import { useState, useEffect, useRef } from 'react';
import Layout from '../../layout/Layout';
import TradingViewWidget from '../../ui/TradingViewWidget/TradingViewWidget';
import './AgentsPage.css';

type NodeStatus = 'idle' | 'active' | 'completed';

interface AgentReport {
  node: string;
  label: string;
  signal: string;
  confidence: number;
  reasoning: string;
  entry?: number;
  stop_loss?: number;
  take_profit?: number;
}

interface DecisionData {
  final_decision: string;
  details?: {
    confidence?: number;
    score?: number;
    reasoning_summary?: string;
    avg_entry?: number;
    avg_stop_loss?: number;
    avg_take_profit?: number;
  };
}

const NODES = ['MarketData', 'TechnicalAgent', 'SentimentAgent', 'OrderFlowAgent', 'RiskAgent', 'DecisionAgent'];
const nodeLabel: Record<string, string> = {
  MarketData:     'Market Data',
  TechnicalAgent: 'Technical Analysis',
  SentimentAgent: 'Sentiment Analysis',
  OrderFlowAgent: 'Order Flow / Volume',
  RiskAgent:      'Risk Management',
  DecisionAgent:  'Decision Aggregation',
};
const signalColor: Record<string, string> = {
  BUY: '#2ecc71', SELL: '#e74c3c', WAIT: '#f1c40f', AVOID: '#e67e22', 'NO TRADE': '#f1c40f',
};

const signalClass = (s: string) => s?.replace(' ', '-') ?? '';

export default function AgentsPage() {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [isProcessing, setIsProcessing] = useState(false);
  const [nodeStatus, setNodeStatus] = useState<Record<string, NodeStatus>>(() =>
    Object.fromEntries(NODES.map(n => [n, 'idle']))
  );
  // Individual agent reports (for node click details)
  const [agentReports, setAgentReports] = useState<Record<string, AgentReport>>({});

  // Ticker-style log: a queue of strings (drained via ref, no re-renders needed)
  const [tickerMsg, setTickerMsg] = useState<string>('');

  const [tickerVisible, setTickerVisible] = useState(false);

  // Decision summary
  const [decisionData, setDecisionData] = useState<DecisionData | null>(null);

  // Side panel
  const [sidePanelMode, setSidePanelMode] = useState<'agent' | 'decision' | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  // Approval modal
  const [showApprovalModal, setShowApprovalModal] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const tickerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logQueueRef = useRef<string[]>([]);

  // Ticker engine: drain queue one message at a time
  const drainQueue = () => {
    const q = logQueueRef.current;
    if (q.length === 0) {
      setTickerVisible(false);
      return;
    }
    const next = q.shift()!;
    setTickerMsg(next);
    setTickerVisible(true);
    tickerTimerRef.current = setTimeout(() => {
      setTickerVisible(false);
      setTimeout(() => drainQueue(), 400); // gap between messages
    }, 2800);
  };

  const pushLog = (msg: string) => {
    logQueueRef.current.push(msg);
    if (!tickerTimerRef.current || logQueueRef.current.length === 1) {
      drainQueue();
    }
  };

  useEffect(() => {
    return () => { if (tickerTimerRef.current) clearTimeout(tickerTimerRef.current); };
  }, []);

  const setNode = (node: string, status: NodeStatus) =>
    setNodeStatus(prev => ({ ...prev, [node]: status }));

  const resetAll = () => {
    setNodeStatus(Object.fromEntries(NODES.map(n => [n, 'idle'])));
    setAgentReports({});
    setDecisionData(null);
    setSidePanelMode(null);
    setSelectedAgent(null);
    logQueueRef.current = [];
    if (tickerTimerRef.current) clearTimeout(tickerTimerRef.current);
    setTickerVisible(false);
  };

  const startAnalysis = () => {
    wsRef.current?.close();
    resetAll();
    setIsProcessing(true);
    pushLog(`Initializing pipeline for ${symbol}…`);

    const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';
    const ws = new WebSocket(`${WS_URL}/api/v1/ws/signals/${symbol.replace('/', '_')}`);
    wsRef.current = ws;

    ws.onerror = () => { pushLog('❌ Cannot connect to backend (port 8000).'); setIsProcessing(false); };
    ws.onclose = (e) => {
      if (e.code !== 1000 && e.code !== 1005) pushLog(`⚠️ Connection closed (code ${e.code}).`);
      setIsProcessing(false);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as { type: string; node?: string; data?: any; decision?: any; message?: string };

        if (msg.type === 'node_start') {
          setNode(msg.node!, 'active');
          if (msg.node === 'DecisionAgent') pushLog('Decision Agent synthesizing all reports…');
          else if (msg.node !== 'MarketData') pushLog(`${nodeLabel[msg.node!]} analyzing…`);

        } else if (msg.type === 'node_complete') {
          setNode(msg.node!, 'completed');
          const d = msg.data ?? {};
          if (msg.node === 'MarketData') {
            pushLog('✅ Live market data fetched successfully.');
          } else {
            const sig = d.signal ?? 'WAIT';
            const conf = d.confidence ? `${Math.round(d.confidence * 100)}%` : 'N/A';
            const report: AgentReport = {
              node: msg.node!,
              label: nodeLabel[msg.node!],
              signal: sig,
              confidence: d.confidence ?? 0,
              reasoning: d.reasoning ?? 'No reasoning provided.',
              entry: d.entry,
              stop_loss: d.stop_loss,
              take_profit: d.take_profit,
            };
            setAgentReports(prev => ({ ...prev, [msg.node!]: report }));
            pushLog(`${report.label}: ${sig} (${conf} confidence)`);
          }

        } else if (msg.type === 'decision') {
          setNode('DecisionAgent', 'completed');
          const d: DecisionData = {
            final_decision: msg.data?.final_decision ?? 'N/A',
            details: msg.data?.details,
          };
          setDecisionData(d);
          pushLog(`🏁 Final Decision: ${d.final_decision}`);
          // Auto-open decision panel
          setTimeout(() => setSidePanelMode('decision'), 600);

        } else if (msg.type === 'paused') {
          pushLog('⏸ Pipeline paused — awaiting human approval.');
          if (msg.decision) setDecisionData({ final_decision: msg.decision });
          setShowApprovalModal(true);
          setIsProcessing(false);

        } else if (msg.type === 'completed') {
          pushLog('✅ Analysis cycle complete.');
          setIsProcessing(false);

        } else if (msg.type === 'error') {
          pushLog(`❌ ${msg.message}`);
          setIsProcessing(false);
        }
      } catch (err) { console.error('[WS]', err); }
    };
  };

  const handleResolution = async (action: 'approve' | 'reject') => {
    setShowApprovalModal(false);
    pushLog(`Human operator ${action === 'approve' ? '✅ approved' : '❌ rejected'} the trade.`);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const res = await fetch(`${API_URL}/api/v1/signals/${symbol.replace('/', '_')}/resolve`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (data.status === 'resolved') pushLog(`Trade ${action === 'approve' ? 'executed in paper portfolio.' : 'rejected.'}`);
    } catch { pushLog('Error contacting resolution endpoint.'); }
  };

  const openAgentPanel = (node: string) => {
    setSelectedAgent(node);
    setSidePanelMode('agent');
  };

  const selected = selectedAgent ? agentReports[selectedAgent] : null;

  return (
    <Layout>
      <div className="agents-page-wrapper">
        {/* Header */}
        <header className="agents-header">
          <h1>Agents Collaborative Network</h1>
          <div className="symbol-input-group">
            <input type="text" className="symbol-input" value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())} placeholder="e.g. BTCUSDT" />
            <button className="trigger-btn" onClick={startAnalysis} disabled={isProcessing}>
              {isProcessing ? 'Processing…' : 'Analyze Market'}
            </button>
          </div>
        </header>

        {/* Ticker bar */}
        <div className="ticker-bar">
          <span className={`ticker-msg ${tickerVisible ? 'visible' : ''}`}>{tickerMsg}</span>
        </div>

        <div className="agents-workspace">
          {/* Chart */}
          <div className="agents-chart-view">
            <TradingViewWidget symbol={symbol} theme="dark" allow_symbol_change={false} hide_side_toolbar={false} interval="15" />
          </div>

          {/* Pipeline */}
          <div className="agents-network-view">
            <h2 className="network-title">Processing Pipeline</h2>

            {/* Market Data node */}
            <div className={`agent-node ${nodeStatus.MarketData}`} style={{ marginBottom: '1rem' }}>
              <h3><div className="status-indicator" /> {nodeLabel.MarketData}</h3>
              <p className="node-sub">Streams live OHLCV, price, and order book data</p>
            </div>

            {/* 4 Analysis agent nodes */}
            <div className="nodes-container">
              {['TechnicalAgent', 'SentimentAgent', 'OrderFlowAgent', 'RiskAgent'].map(n => {
                const r = agentReports[n];
                return (
                  <div key={n} className={`agent-node ${nodeStatus[n]} ${r ? 'clickable' : ''}`}
                    onClick={() => r && openAgentPanel(n)}>
                    <h3><div className="status-indicator" /> {nodeLabel[n]}</h3>
                    {r && (
                      <div className="node-result">
                        <span className={`node-signal ${r.signal}`}>{r.signal}</span>
                        <span className="node-conf">{Math.round(r.confidence * 100)}% conf</span>
                        <span className="node-view-hint">view</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Decision node */}
            <div className={`decision-node ${nodeStatus.DecisionAgent} ${decisionData ? 'clickable' : ''}`}
              onClick={() => decisionData && setSidePanelMode('decision')}>
              <h3>Final Aggregation Agent{decisionData && <span className="node-view-hint" style={{ marginLeft: 8 }}>View →</span>}</h3>
              <div className={`decision-result ${signalClass(decisionData?.final_decision ?? '')}`}>
                {decisionData?.final_decision ?? 'PENDING'}
              </div>
            </div>
          </div>

          {/* Side Panel */}
          <div className={`side-panel ${sidePanelMode ? 'open' : ''}`}>
            <button className="side-panel-close" onClick={() => setSidePanelMode(null)}>✕</button>

            {sidePanelMode === 'agent' && selected && (
              <>
                <div className="side-panel-title">{selected.label}</div>
                <div className="side-panel-signal-row">
              <div className={`sp-signal ${signalClass(selected.signal)}`}>{selected.signal}</div>
                  <span className="sp-conf">{Math.round(selected.confidence * 100)}% confidence</span>
                </div>
                <div className="sp-section-title">Reasoning</div>
                <div className="sp-reasoning">{selected.reasoning}</div>
                {(selected.entry || selected.stop_loss || selected.take_profit) && (
                  <>
                    <div className="sp-section-title">Trade Levels</div>
                    <div className="sp-levels">
                      {selected.entry && <div><span>Entry</span><strong>${selected.entry.toLocaleString()}</strong></div>}
                      {selected.stop_loss && <div><span>Stop Loss</span><strong style={{ color: '#e74c3c' }}>${selected.stop_loss.toLocaleString()}</strong></div>}
                      {selected.take_profit && <div><span>Take Profit</span><strong style={{ color: '#2ecc71' }}>${selected.take_profit.toLocaleString()}</strong></div>}
                    </div>
                  </>
                )}
              </>
            )}

            {sidePanelMode === 'decision' && (
              <>
                <div className="side-panel-title">Final Decision</div>
                <div className={`sp-final-decision ${signalClass(decisionData?.final_decision ?? '')}`}>
                  {decisionData?.final_decision ?? '—'}
                </div>
                {decisionData?.details && (
                  <>
                    <div className="sp-meta-row">
                      <span>Confidence</span><strong>{Math.round((decisionData.details.confidence ?? 0) * 100)}%</strong>
                    </div>
                    <div className="sp-meta-row">
                      <span>Conviction Score</span><strong>{(decisionData.details.score ?? 0).toFixed(2)}</strong>
                    </div>
                    {decisionData.details.reasoning_summary && (
                      <>
                        <div className="sp-section-title" style={{ marginTop: '1rem' }}>Synthesis</div>
                        <div className="sp-reasoning">{decisionData.details.reasoning_summary}</div>
                      </>
                    )}
                    {(decisionData.details.avg_entry || decisionData.details.avg_stop_loss || decisionData.details.avg_take_profit) && (
                      <>
                        <div className="sp-section-title">Consensus Levels</div>
                        <div className="sp-levels">
                          {decisionData.details.avg_entry && <div><span>Avg Entry</span><strong>${decisionData.details.avg_entry.toLocaleString()}</strong></div>}
                          {decisionData.details.avg_stop_loss && <div><span>Avg Stop Loss</span><strong style={{ color: '#e74c3c' }}>${decisionData.details.avg_stop_loss.toLocaleString()}</strong></div>}
                          {decisionData.details.avg_take_profit && <div><span>Avg Take Profit</span><strong style={{ color: '#2ecc71' }}>${decisionData.details.avg_take_profit.toLocaleString()}</strong></div>}
                        </div>
                      </>
                    )}
                  </>
                )}

                <div className="sp-section-title" style={{ marginTop: '1.5rem' }}>Agent Votes</div>
                <div className="sp-votes">
                  {['TechnicalAgent', 'SentimentAgent', 'OrderFlowAgent', 'RiskAgent'].map(n => {
                    const r = agentReports[n];
                    return (
                      <div key={n} className="sp-vote-row" onClick={() => r && openAgentPanel(n)}>
                        <span className="sp-vote-label">{nodeLabel[n]}</span>
                        {r ? (
                          <span className="sp-vote-signal" style={{ color: signalColor[r.signal] ?? '#aaa' }}>{r.signal}</span>
                        ) : (
                          <span className="sp-vote-signal" style={{ color: '#555' }}>—</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Approval Modal */}
      {showApprovalModal && (
        <div className="modal-overlay">
          <div className="approval-modal">
            <h2>Human Approval Required</h2>
            <div className="modal-content">
              <p>The Decision Agent has proposed a trade that requires your verification.</p>
              <div className="proposed-trade">
                <strong>Symbol:</strong> {symbol}<br />
                <strong>Action:</strong>{' '}
                <span style={{ color: signalColor[decisionData?.final_decision ?? ''] ?? '#fff', fontWeight: 'bold', fontSize: '1.3rem' }}>
                  {decisionData?.final_decision}
                </span>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-reject" onClick={() => handleResolution('reject')}>❌ Reject</button>
              <button className="btn-approve" onClick={() => handleResolution('approve')}>✅ Approve</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
