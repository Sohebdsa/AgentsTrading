import Layout from '../../layout/Layout';
import TradingViewWidget from '../../ui/TradingViewWidget/TradingViewWidget';
import MarketOverviewWidget from '../../ui/MarketOverviewWidget/MarketOverviewWidget';
import StockHeatmapWidget from '../../ui/StockHeatmapWidget/StockHeatmapWidget';
import TopStoriesWidget from '../../ui/TopStoriesWidget/TopStoriesWidget';
import './DashboardPage.css';

const DashboardPage = () => {
    return (
        <Layout>
            <div className="dash-page">

                {/* ── Page header ─────────────────────────────────── */}
                <div className="dash-header">
                    <div className="dash-header-left">
                        <span className="dash-live-dot" />
                        <span className="dash-live-label">Live</span>
                    </div>
                    <div>
                        <h1 className="dash-title">Dashboard</h1>
                        <p className="dash-sub">Real-time market intelligence, powered by TradingView</p>
                    </div>
                </div>

                {/* ── Row 1 : Market Overview + Heatmap ───────────── */}
                <div className="dash-row dash-row--split">

                    {/* Market Overview */}
                    <section className="dash-panel dash-panel--narrow">
                        <div className="dash-panel-header">
                            <span className="dash-panel-dot" />
                            <h2 className="dash-panel-title">Market Overview</h2>
                        </div>
                        <MarketOverviewWidget height={580} />
                    </section>

                    {/* Stock Heatmap */}
                    <section className="dash-panel dash-panel--wide">
                        <div className="dash-panel-header">
                            <span className="dash-panel-dot" />
                            <h2 className="dash-panel-title">Stock Heatmap</h2>
                        </div>
                        <StockHeatmapWidget height={580} />
                    </section>
                </div>

                {/* ── Row 2 : Top Stories + Advanced Chart ─────────── */}
                <div className="dash-row dash-row--split">

                    {/* Top Stories */}
                    <section className="dash-panel dash-panel--narrow">
                        <div className="dash-panel-header">
                            <span className="dash-panel-dot" />
                            <h2 className="dash-panel-title">Top Stories</h2>
                        </div>
                        <TopStoriesWidget height={500} />
                    </section>

                    {/* Advanced Chart */}
                    <section className="dash-panel dash-panel--wide">
                        <div className="dash-panel-header">
                            <span className="dash-panel-dot" />
                            <h2 className="dash-panel-title">Advanced Chart — AAPL</h2>
                        </div>
                        <TradingViewWidget
                            symbol="NASDAQ:AAPL"
                            interval="D"
                            height={600}
                        />
                    </section>
                </div>

            </div>
        </Layout>
    );
};

export default DashboardPage;
