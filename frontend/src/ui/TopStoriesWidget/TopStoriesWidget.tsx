import { useEffect, useRef, memo } from 'react';

interface TopStoriesWidgetProps {
    height?: number;
}

const TopStoriesWidget = ({ height = 500 }: TopStoriesWidgetProps) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const script = document.createElement('script');
        script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-timeline.js';
        script.type = 'text/javascript';
        script.async = true;
        script.innerHTML = JSON.stringify({
            feedMode: 'all_symbols',
            isTransparent: true,
            displayMode: 'regular',
            width: '100%',
            height,
            colorTheme: 'dark',
            locale: 'en'
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

export default memo(TopStoriesWidget);
