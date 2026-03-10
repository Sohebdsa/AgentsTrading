import { useEffect, useRef, memo } from 'react';

interface MarketOverviewWidgetProps {
    height?: number;
}

const MarketOverviewWidget = ({ height = 580 }: MarketOverviewWidgetProps) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const script = document.createElement('script');
        script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js';
        script.type = 'text/javascript';
        script.async = true;
        script.innerHTML = JSON.stringify({
            colorTheme: 'dark',
            dateRange: '1Y',
            showChart: true,
            locale: 'en',
            largeChartUrl: '',
            isTransparent: true,
            showSymbolLogo: true,
            showFloatingTooltip: false,
            width: '100%',
            height,
            tabs: [
                {
                    title: 'Indices',
                    symbols: [
                        { s: 'FOREXCOM:SPXUSD', d: 'S&P 500 Index' },
                        { s: 'FOREXCOM:NSXUSD', d: 'US 100 Cash CFD' },
                        { s: 'FOREXCOM:DJI', d: 'Dow Jones Index' },
                        { s: 'INDEX:NKY', d: 'Nikkei 225' },
                        { s: 'INDEX:DEU40', d: 'DAX Index' },
                    ],
                    originalTitle: 'Indices',
                },
                {
                    title: 'Futures',
                    symbols: [
                        { s: 'CME_MINI:ES1!', d: 'S&P 500' },
                        { s: 'CME:6E1!', d: 'Euro' },
                        { s: 'COMEX:GC1!', d: 'Gold' },
                        { s: 'NYMEX:CL1!', d: 'WTI Crude Oil' },
                        { s: 'NYMEX:NG1!', d: 'Gas' },
                        { s: 'CBOT:ZC1!', d: 'Corn' },
                    ],
                    originalTitle: 'Futures',
                },
                {
                    title: 'Bonds',
                    symbols: [
                        { s: 'CBOT:ZB1!', d: 'T-Bond' },
                        { s: 'CBOT:UB1!', d: 'Ultra T-Bond' },
                        { s: 'EUREX:FGBL1!', d: 'Euro Bund' },
                        { s: 'EUREX:FBTP1!', d: 'Euro BTP' },
                        { s: 'EUREX:FGBM1!', d: 'Euro BOBL' },
                    ],
                    originalTitle: 'Bonds',
                },
                {
                    title: 'Forex',
                    symbols: [
                        { s: 'FX:EURUSD', d: 'EUR to USD' },
                        { s: 'FX:GBPUSD', d: 'GBP to USD' },
                        { s: 'FX:USDJPY', d: 'USD to JPY' },
                        { s: 'FX:USDCHF', d: 'USD to CHF' },
                        { s: 'FX:AUDUSD', d: 'AUD to USD' },
                        { s: 'FX:USDCAD', d: 'USD to CAD' },
                    ],
                    originalTitle: 'Forex',
                },
            ],
        });

        container.appendChild(script);
        return () => { container.innerHTML = ''; };
    }, [height]);

    return (
        <div
            ref={containerRef}
            style={{ height, width: '100%', overflow: 'hidden' }}
        />
    );
};

export default memo(MarketOverviewWidget);
