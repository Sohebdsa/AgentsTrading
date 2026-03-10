import Layout from './layout/Layout';
import { Button } from './ui';
import './App.css';

function App() {
  return (
    <Layout>
      {/* Hero */}
      <div className="cxa-hero">
        <div className="cxa-hero-badge">⬡ AI-Powered Trading</div>
        <h1 className="cxa-hero-title">
          The Future of <br />
          <span className="cxa-gradient-text">Autonomous Trading</span>
        </h1>
        <p className="cxa-hero-sub">
          Intelligent agents that execute trades, analyze markets, and adapt
          to your strategy — 24/7, without interruption.
        </p>
        <div className="cxa-hero-actions">
          <Button as="a" href="/dashboard" variant="primary" size="lg">
            Get Started →
          </Button>
          <Button as="a" href="/agents" variant="ghost" size="lg">
            Explore Agents
          </Button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="cxa-stats">
        {[
          { label: 'Active Agents', value: '1,240+' },
          { label: 'Trades Executed', value: '$48M+' },
          { label: 'Win Rate', value: '73.4%' },
          { label: 'Uptime', value: '99.9%' },
        ].map((s) => (
          <div key={s.label} className="cxa-stat-card">
            <span className="cxa-stat-value">{s.value}</span>
            <span className="cxa-stat-label">{s.label}</span>
          </div>
        ))}
      </div>
    </Layout>
  );
}

export default App;
