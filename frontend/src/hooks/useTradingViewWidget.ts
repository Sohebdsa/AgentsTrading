import { useEffect, useRef } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

export type TradingViewInterval =
    | '1' | '3' | '5' | '15' | '30' | '45'
    | '60' | '120' | '180' | '240'
    | 'D' | 'W' | 'M';

export type TradingViewChartStyle =
    | '0'   // Bars
    | '1'   // Candles
    | '2'   // Lines
    | '3'   // Area
    | '4'   // Heikin Ashi
    | '5'   // Renko
    | '6'   // Kagi
    | '7'   // Point & Figure
    | '8'   // Line Break
    | '9';  // Baseline

export interface TradingViewWidgetConfig {
    /** TradingView symbol, e.g. "NASDAQ:AAPL" or "BINANCE:BTCUSDT" */
    symbol: string;
    interval?: TradingViewInterval;
    /** 'dark' | 'light' */
    theme?: 'dark' | 'light';
    locale?: string;
    style?: TradingViewChartStyle;
    timezone?: string;
    backgroundColor?: string;
    gridColor?: string;
    allow_symbol_change?: boolean;
    hide_side_toolbar?: boolean;
    hide_top_toolbar?: boolean;
    hide_legend?: boolean;
    hide_volume?: boolean;
    save_image?: boolean;
    calendar?: boolean;
    details?: boolean;
    hotlist?: boolean;
    withdateranges?: boolean;
    autosize?: boolean;
    studies?: string[];
    watchlist?: string[];
    compareSymbols?: string[];
}

// ── Default config ───────────────────────────────────────────────────────────

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

const SCRIPT_SRC =
    'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * useTradingViewWidget
 *
 * Injects the TradingView Advanced Chart embed script into the given container
 * ref. The script is appended once on mount and the container is cleared on
 * unmount, making it safe to use in strict-mode and multiple instances.
 *
 * @example
 * const containerRef = useTradingViewWidget({ symbol: 'BINANCE:BTCUSDT' });
 * return <div ref={containerRef} style={{ height: 550 }} />;
 */
export function useTradingViewWidget(config: TradingViewWidgetConfig) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const merged = { ...DEFAULTS, ...config };

        const script = document.createElement('script');
        script.src = SCRIPT_SRC;
        script.type = 'text/javascript';
        script.async = true;
        script.innerHTML = JSON.stringify(merged);

        container.appendChild(script);

        return () => {
            // Cleanup on unmount or when config changes
            container.innerHTML = '';
        };
    },
        // Re-run when symbol or key display props change
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [config.symbol, config.interval, config.style, config.theme]);

    return containerRef;
}
