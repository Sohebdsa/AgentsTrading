import { useState, useEffect, useRef } from 'react';
import Layout from '../../layout/Layout';
import TradingViewWidget from '../../ui/TradingViewWidget/TradingViewWidget';
import './AgentsPage.css';

interface ChatMessage {
  id: string;
  author: string;
  text: string;
  type?: 'system' | 'agent';
}

type NodeStatus = 'idle' | 'active' | 'completed';

const AGENT_NODES = ['MarketData', 'TechnicalAgent', 'SentimentAgent', 'OrderFlowAgent', 'RiskAgent', 'DecisionAgent'];

const nodeLabel: Record<string, string> = {
  MarketData:     'Market Data',
  TechnicalAgent: 'Technical Analysis',
  SentimentAgent: 'Sentiment Analysis',
  OrderFlowAgent: 'Order Flow / Volume',
  RiskAgent:      'Risk Management',
  DecisionAgent:  'Decision Aggregation',
};

const signalColor: Record<string, string> = {
  BUY:  '#2ecc71',
  SELL: '#e74c3c',
  WAIT: '#f1c40f',
  AVOID:'#e67e22',
};

export default function AgentsPage() {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [isProcessing, setIsProcessing] = useState(false);
  const [nodeStatus, setNodeStatus] = useState<Record<string, NodeStatus>>(() =>
    Object.fromEntries(AGENT_NODES.map(n => [n, 'idle']))
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [decision, setDecision] = useState<string | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [messages]);

  const addMessage = (author: string, text: string, type: 'system' | 'agent' = 'agent') => {
    setMessages(prev => [...prev, { id: `${Date.now()}-${Math.random()}`, author, text, type }]);
  };

  const setNode = (node: string, status: NodeStatus) =>
    setNodeStatus(prev => ({ ...prev, [node]: status }));

  const startAnalysis = () => {
    wsRef.current?.close();

    setIsProcessing(true);
    setDecision(null);
    setShowApprovalModal(false);
    setNodeStatus(Object.fromEntries(AGENT_NODES.map(n => [n, 'idle'])));
    setMessages([]);
    addMessage('System', `Initializing analysis pipeline for ${symbol}…`, 'system');

    // Use the symbol as passed (no slash replacement needed for WS path)
    const wsSymbol = symbol.replace('/', '_');
    const ws = new WebSocket(`ws://localhost:8000/api/v1/ws/signals/${wsSymbol}`);
    wsRef.current = ws;

    ws.onopen = () => console.log('[WS] Connected to AI Agents server');
    ws.onerror = () => {
      addMessage('System', '❌ Cannot connect to backend. Is uvicorn running on port 8000?', 'system');
      setIsProcessing(false);
    };
    ws.onclose = (e) => {
      if (e.code !== 1000 && e.code !== 1005) {
        addMessage('System', `⚠️ Connection closed unexpectedly (code ${e.code}). Check backend logs.`, 'system');
      }
      setIsProcessing(false);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as { type: string; node?: string; data?: any; decision?: string; message?: string };

        if (msg.type === 'node_start') {
          setNode(msg.node!, 'active');
          if (msg.node !== 'MarketData' && msg.node !== 'DecisionAgent') {
            addMessage('System', `${nodeLabel[msg.node!]} agent is analyzing…`, 'system');
          } else if (msg.node === 'DecisionAgent') {
            addMessage('System', 'Decision Agent synthesizing all reports…', 'system');
          }

        } else if (msg.type === 'node_complete') {
          setNode(msg.node!, 'completed');
          const d = msg.data ?? {};
          if (msg.node === 'MarketData') {
            addMessage('System', d.message ?? 'Market data fetched.', 'system');
          } else {
            // Analysis agent completed
            const sig = d.signal ?? 'WAIT';
            const conf = d.confidence ? `${Math.round(d.confidence * 100)}%` : 'N/A';
            const entry = d.entry ? ` | Entry: $${d.entry}` : '';
            const sl = d.stop_loss ? ` | SL: $${d.stop_loss}` : '';
            const tp = d.take_profit ? ` | TP: $${d.take_profit}` : '';
            addMessage(
              `${d.agent_name ?? msg.node} Agent`,
              `[${sig}] (${conf} confidence) — ${d.reasoning ?? ''}${entry}${sl}${tp}`
            );
          }

        } else if (msg.type === 'decision') {
          setNode('DecisionAgent', 'completed');
          const finalDecision = msg.data?.final_decision ?? 'N/A';
          const details = msg.data?.details;
          setDecision(finalDecision);
          const detailStr = details
            ? ` | Confidence: ${Math.round((details.confidence ?? 0) * 100)}%, Score: ${(details.score ?? 0).toFixed(2)}`
            : '';
          addMessage('Decision Aggregator', `Final verdict: ${finalDecision}${detailStr}${details?.reasoning_summary ? ` — ${details.reasoning_summary}` : ''}`);

        } else if (msg.type === 'paused') {
          addMessage('System', '⏸ Pipeline paused — awaiting human approval.', 'system');
          if (msg.decision) setDecision(msg.decision);
          setShowApprovalModal(true);
          setIsProcessing(false);

        } else if (msg.type === 'completed') {
          addMessage('System', '✅ Analysis cycle complete.', 'system');
          setIsProcessing(false);

        } else if (msg.type === 'error') {
          addMessage('System', `❌ Error: ${msg.message}`, 'system');
          setIsProcessing(false);
        }
      } catch (err) {
        console.error('[WS] Parse error', err);
      }
    };
  };

  const handleResolution = async (action: 'approve' | 'reject') => {
    setShowApprovalModal(false);
    addMessage('System', `Human operator ${action === 'approve' ? '✅ approved' : '❌ rejected'} the trade.`, 'system');
    try {
      const res = await fetch(`http://localhost:8000/api/v1/signals/${symbol.replace('/', '_')}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (data.status === 'resolved') {
        addMessage('System', `Pipeline resumed. Trade ${action === 'approve' ? 'executed' : 'rejected'}.`, 'system');
      }
    } catch {
      addMessage('System', 'Error contacting resolution endpoint.', 'system');
    }
  };

  return (
    <Layout>
      <div className="agents-page-wrapper">
        <header className="agents-header">
          <h1>Agents Collaborative Network</h1>
          <div className="symbol-input-group">
            <input
              type="text"
              className="symbol-input"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="e.g. BTCUSDT"
            />
            <button className="trigger-btn" onClick={startAnalysis} disabled={isProcessing}>
              {isProcessing ? 'Processing…' : 'Analyze Market'}
            </button>
          </div>
        </header>

        <div className="agents-workspace">
          {/* Chart */}
          <div className="agents-chart-view">
            <TradingViewWidget
              symbol={symbol}
              theme="dark"
              allow_symbol_change={false}
              hide_side_toolbar={false}
              interval="15"
            />
          </div>

          {/* Pipeline Nodes */}
          <div className="agents-network-view">
            <h2 className="network-title">Processing Pipeline</h2>

            <div className={`agent-node ${nodeStatus.MarketData}`} style={{ marginBottom: '1rem' }}>
              <h3><div className="status-indicator" /> {nodeLabel.MarketData}</h3>
              <p style={{ fontSize: '0.9rem', color: '#888', margin: 0 }}>Streams CCXT prices, OHLCV, and order book</p>
            </div>

            <div className="nodes-container">
              {['TechnicalAgent', 'SentimentAgent', 'OrderFlowAgent', 'RiskAgent'].map(n => (
                <div key={n} className={`agent-node ${nodeStatus[n]}`}>
                  <h3><div className="status-indicator" /> {nodeLabel[n]}</h3>
                </div>
              ))}
            </div>

            <div className={`decision-node ${nodeStatus.DecisionAgent}`}>
              <h3>Final Aggregation Agent</h3>
              <div className={`decision-result ${decision ?? ''}`} style={decision ? { color: signalColor[decision] ?? '#fff' } : {}}>
                {decision ?? 'PENDING'}
              </div>
            </div>
          </div>

          {/* Chat Panel */}
          <div className="agents-chat-panel">
            <div className="chat-header">Internal Agent Dialogue</div>
            <div className="chat-messages">
              {messages.length === 0 && (
                <div style={{ color: '#666', textAlign: 'center', marginTop: '40%' }}>
                  No active session. Enter a symbol and click Analyze Market.
                </div>
              )}
              {messages.map((m) => (
                <div key={m.id} className={`chat-message ${m.type === 'system' ? 'system' : ''}`}>
                  {m.type !== 'system' && <div className="chat-author">{m.author}</div>}
                  <div className="chat-text">{m.text}</div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>
      </div>

      {showApprovalModal && (
        <div className="modal-overlay">
          <div className="approval-modal">
            <h2>Human Approval Required</h2>
            <div className="modal-content">
              <p>The Decision Agent has proposed a trade that requires your verification before execution.</p>
              <div className="proposed-trade">
                <strong>Symbol:</strong> {symbol}<br />
                <strong>Proposed Action:</strong>{' '}
                <span style={{ color: signalColor[decision ?? ''] ?? '#fff', fontWeight: 'bold', fontSize: '1.2rem' }}>
                  {decision}
                </span>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-reject" onClick={() => handleResolution('reject')}>❌ Reject Trade</button>
              <button className="btn-approve" onClick={() => handleResolution('approve')}>✅ Approve Trade</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
