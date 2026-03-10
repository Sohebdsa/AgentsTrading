import { memo } from 'react';
import { useTradingViewWidget } from '../../hooks/useTradingViewWidget';
import type { TradingViewWidgetConfig } from '../../hooks/useTradingViewWidget';
import './TradingViewWidget.css';

// ── Types ────────────────────────────────────────────────────────────────────

interface TradingViewWidgetProps extends TradingViewWidgetConfig {
    /** Optional title shown above the chart card */
    title?: string;
    /** Height of the chart area in px (default: 550) */
    height?: number;
    /** Optional CSS class added to the outer wrapper */
    className?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

const TradingViewWidget = ({
    title,
    height = 550,
    className = '',
    ...config
}: TradingViewWidgetProps) => {
    const containerRef = useTradingViewWidget(config);

    // Build the human-readable symbol for the copyright link
    const [exchange, ticker] = (config.symbol ?? '').split(':');
    const symbolSlug = ticker
        ? `${exchange}-${ticker}`.replace(/[^a-zA-Z0-9-]/g, '')
        : exchange;
    const symbolLabel = ticker ?? exchange;

    return (
        <div className={`tv-widget-wrapper ${className}`}>
            {title && <h3 className="tv-widget-title">{title}</h3>}

            {/* TradingView embed container */}
            <div className="tv-widget-card">
                <div
                    className="tradingview-widget-container"
                    ref={containerRef}
                    style={{ height, width: '100%' }}
                >
                    {/* TradingView fills this element */}
                    <div
                        className="tradingview-widget-container__widget"
                        style={{ height: 'calc(100% - 32px)', width: '100%' }}
                    />
                    {/* Required copyright notice */}
                    <div className="tradingview-widget-copyright">
                        <a
                            href={`https://www.tradingview.com/symbols/${symbolSlug}/`}
                            rel="noopener nofollow"
                            target="_blank"
                        >
                            <span className="tv-copyright-link">{symbolLabel} chart</span>
                        </a>
                        <span className="tv-copyright-trademark"> by TradingView</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default memo(TradingViewWidget);
