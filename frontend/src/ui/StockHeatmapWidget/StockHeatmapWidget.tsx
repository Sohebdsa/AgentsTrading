import { useEffect, useRef, memo } from 'react';

interface StockHeatmapWidgetProps {
    height?: number;
}

const StockHeatmapWidget = ({ height = 580 }: StockHeatmapWidgetProps) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const script = document.createElement('script');
        script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-stock-heatmap.js';
        script.type = 'text/javascript';
        script.async = true;
        script.innerHTML = JSON.stringify({
            exchanges: [],
            dataSource: 'SPX500',
            grouping: 'sector',
            blockSize: 'market_cap_basic',
            blockColor: 'change',
            locale: 'en',
            symbolUrl: '',
            colorTheme: 'dark',
            hasTopBar: true,
            isDataSetEnabled: true,
            isZoomEnabled: true,
            hasSymbolTooltip: true,
            isMonoSize: false,
            width: '100%',
            height,
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

export default memo(StockHeatmapWidget);
