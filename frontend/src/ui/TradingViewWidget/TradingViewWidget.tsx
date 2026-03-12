import { useEffect, useRef, memo } from 'react';
import type { TradingViewWidgetConfig } from '../../hooks/useTradingViewWidget';
import './TradingViewWidget.css';

interface TradingViewWidgetProps extends TradingViewWidgetConfig {
    title?: string;
    height?: number;
    className?: string;
}

const DEFAULTS: Partial<TradingViewWidgetConfig> = {
    interval: 'D',
    theme: 'dark',
    locale: 'en',
    style: '1',
    timezone: 'Etc/UTC',
    backgroundColor: '#0F0F0F',
    gridColor: 'rgba(242, 242, 242, 0.06)',
    allow_symbol_change: true,
    hide_side_toolbar: true,
    hide_top_toolbar: false,
    hide_legend: false,
    hide_volume: false,
    save_image: true,
    calendar: false,
    details: false,
    hotlist: false,
    withdateranges: false,
    autosize: true,
    studies: [],
    watchlist: [],
    compareSymbols: [],
};

const TradingViewWidget = ({
    title,
    height = 550,
    className = '',
    ...config
}: TradingViewWidgetProps) => {
    const containerRef = useRef<HTMLDivElement>(null);

    // Build the human-readable symbol for the copyright link
    const [exchange, ticker] = (config.symbol ?? '').split(':');
    const symbolSlug = ticker
        ? `${exchange}-${ticker}`.replace(/[^a-zA-Z0-9-]/g, '')
        : exchange;
    const symbolLabel = ticker ?? exchange;

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // Clean slate on every cycle (fixes the shrinking iframe bug on HMR or re-renders)
        container.innerHTML = `
            <div class="tradingview-widget-container__widget" style="height:calc(100% - 32px); width:100%"></div>
            <div class="tradingview-widget-copyright">
                <a href="https://www.tradingview.com/symbols/${symbolSlug}/" rel="noopener nofollow" target="_blank">
                    <span class="tv-copyright-link">${symbolLabel} chart</span>
                </a>
                <span class="tv-copyright-trademark"> by TradingView</span>
            </div>
        `;

        const merged = { ...DEFAULTS, ...config };
        const script = document.createElement('script');
        script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
        script.type = 'text/javascript';
        script.async = true;
        script.innerHTML = JSON.stringify(merged);

        container.appendChild(script);

        return () => {
            container.innerHTML = '';
        };
    }, [config.symbol, config.interval, config.style, config.theme, symbolLabel, symbolSlug]);

    return (
        <div className={`tv-widget-wrapper ${className}`}>
            {title && <h3 className="tv-widget-title">{title}</h3>}

            <div className="tv-widget-card" style={{ flex: 1 }}>
                {/* 
                  React only renders the outer wrapper.
                  The inner chart div, copyright link, and script are injected via useEffect
                  so TradingView doesn't mutate React's virtual DOM nodes.
                */}
                <div
                    className="tradingview-widget-container"
                    ref={containerRef}
                    style={{ height: '100%', width: '100%' }}
                />
            </div>
        </div>
    );
};

export default memo(TradingViewWidget);
