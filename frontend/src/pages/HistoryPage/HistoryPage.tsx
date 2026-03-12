import Layout from '../../layout/Layout';
import './HistoryPage.css';

interface TradeRecord {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  entryPrice: number;
  exitPrice: number;
  size: number;
  pnl: number;
  status: 'CLOSED' | 'OPEN';
  date: string;
  duration: string;
}

const DEMO_TRADES: TradeRecord[] = [
  { id: 'TRD-9021', symbol: 'BTCUSDT', type: 'BUY',  entryPrice: 63200.50, exitPrice: 64100.00, size: 0.15, pnl: 134.92, status: 'CLOSED', date: '2026-03-12 14:30', duration: '2h 15m' },
  { id: 'TRD-9020', symbol: 'ETHUSDT', type: 'SELL', entryPrice: 3450.20,  exitPrice: 3410.80,  size: 2.50, pnl: 98.50,  status: 'CLOSED', date: '2026-03-12 11:20', duration: '4h 10m' },
  { id: 'TRD-9019', symbol: 'SOLUSDT', type: 'BUY',  entryPrice: 145.30,   exitPrice: 142.10,   size: 15.0, pnl: -48.00, status: 'CLOSED', date: '2026-03-11 22:15', duration: '1h 45m' },
  { id: 'TRD-9018', symbol: 'BTCUSDT', type: 'SELL', entryPrice: 64500.00, exitPrice: 63800.50, size: 0.20, pnl: 139.90, status: 'CLOSED', date: '2026-03-11 18:05', duration: '5h 20m' },
  { id: 'TRD-9017', symbol: 'BNBUSDT', type: 'BUY',  entryPrice: 580.40,   exitPrice: 595.60,   size: 4.00, pnl: 60.80,  status: 'CLOSED', date: '2026-03-11 14:40', duration: '3h 30m' },
  { id: 'TRD-9016', symbol: 'AVAXUSDT',type: 'SELL', entryPrice: 42.15,    exitPrice: 43.50,    size: 25.0, pnl: -33.75, status: 'CLOSED', date: '2026-03-11 09:15', duration: '0h 45m' },
  { id: 'TRD-9015', symbol: 'ETHUSDT', type: 'BUY',  entryPrice: 3380.00,  exitPrice: 3460.50,  size: 1.80, pnl: 144.90, status: 'CLOSED', date: '2026-03-10 20:30', duration: '8h 15m' },
  { id: 'TRD-9014', symbol: 'BTCUSDT', type: 'BUY',  entryPrice: 61800.25, exitPrice: 62450.00, size: 0.10, pnl: 64.97,  status: 'CLOSED', date: '2026-03-10 15:45', duration: '2h 50m' },
  { id: 'TRD-9013', symbol: 'SOLUSDT', type: 'SELL', entryPrice: 152.80,   exitPrice: 148.20,   size: 20.0, pnl: 92.00,  status: 'CLOSED', date: '2026-03-10 11:20', duration: '4h 05m' },
  { id: 'TRD-9012', symbol: 'ADAUSDT', type: 'BUY',  entryPrice: 0.4520,   exitPrice: 0.4410,   size: 5000, pnl: -55.00, status: 'CLOSED', date: '2026-03-10 08:10', duration: '1h 30m' },
  { id: 'TRD-9011', symbol: 'BTCUSDT', type: 'SELL', entryPrice: 63100.00, exitPrice: 62200.50, size: 0.25, pnl: 224.87, status: 'CLOSED', date: '2026-03-09 23:45', duration: '6h 40m' },
  { id: 'TRD-9010', symbol: 'ETHUSDT', type: 'SELL', entryPrice: 3510.40,  exitPrice: 3545.20,  size: 1.50, pnl: -52.20, status: 'CLOSED', date: '2026-03-09 19:15', duration: '2h 10m' },
  { id: 'TRD-9009', symbol: 'DOTUSDT', type: 'BUY',  entryPrice: 6.85,     exitPrice: 7.20,     size: 150,  pnl: 52.50,  status: 'CLOSED', date: '2026-03-09 14:30', duration: '3h 50m' },
  { id: 'TRD-9008', symbol: 'LINKUSDT',type: 'BUY',  entryPrice: 14.20,    exitPrice: 14.85,    size: 40.0, pnl: 26.00,  status: 'CLOSED', date: '2026-03-09 10:05', duration: '1h 25m' },
  { id: 'TRD-9007', symbol: 'BTCUSDT', type: 'BUY',  entryPrice: 60500.00, exitPrice: 61900.00, size: 0.12, pnl: 168.00, status: 'CLOSED', date: '2026-03-09 05:20', duration: '12h 10m' },
];

export default function HistoryPage() {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(val);
  };

  const formatCrypto = (val: number) => {
      // If the value is small, show more decimals. For BTC etc, standard is 2.
      const decimals = val < 100 ? 4 : 2;
      return new Intl.NumberFormat('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(val);
  }

  const totalPnl = DEMO_TRADES.reduce((sum, t) => sum + t.pnl, 0);
  const winRate = (DEMO_TRADES.filter(t => t.pnl > 0).length / DEMO_TRADES.length) * 100;

  return (
    <Layout>
      <div className="history-page-wrapper">
        <header className="history-header">
          <div>
            <h1>Trade History</h1>
            <p className="history-subtitle">Log of all executed trades across all active agents.</p>
          </div>
          
          <div className="history-metrics">
            <div className="metric-box">
               <span className="metric-label">Total PnL</span>
               <span className={`metric-value ${totalPnl >= 0 ? 'positive' : 'negative'}`}>
                  {totalPnl >= 0 ? '+' : ''}{formatCurrency(totalPnl)}
               </span>
            </div>
            <div className="metric-box">
               <span className="metric-label">Win Rate</span>
               <span className="metric-value neutral">{winRate.toFixed(1)}%</span>
            </div>
            <div className="metric-box">
               <span className="metric-label">Total Trades</span>
               <span className="metric-value neutral">{DEMO_TRADES.length}</span>
            </div>
          </div>
        </header>

        <div className="table-container">
          <table className="history-table">
            <thead>
              <tr>
                <th>Trade ID</th>
                <th>Date Filter</th>
                <th>Symbol</th>
                <th>Position</th>
                <th className="num-col">Size</th>
                <th className="num-col">Entry Price</th>
                <th className="num-col">Exit Price</th>
                <th>Duration</th>
                <th className="num-col">PnL</th>
              </tr>
            </thead>
            <tbody>
              {DEMO_TRADES.map((trade) => (
                <tr key={trade.id}>
                  <td className="id-cell">{trade.id}</td>
                  <td className="date-cell">{trade.date}</td>
                  <td className="symbol-cell">{trade.symbol}</td>
                  <td className="type-cell">
                    <span className={`badge ${trade.type}`}>{trade.type}</span>
                  </td>
                  <td className="num-col size-cell">{trade.size}</td>
                  <td className="num-col price-cell">${formatCrypto(trade.entryPrice)}</td>
                  <td className="num-col price-cell">${formatCrypto(trade.exitPrice)}</td>
                  <td className="duration-cell">{trade.duration}</td>
                  <td className={`num-col pnl-cell ${trade.pnl >= 0 ? 'positive' : 'negative'}`}>
                    {trade.pnl >= 0 ? '+' : ''}{formatCurrency(trade.pnl)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
