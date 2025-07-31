import React, { lazy, Suspense, ComponentProps } from 'react';
import LoadingSpinner from './LoadingSpinner';

// Lazy load Chart.js components
const Line = lazy(() => import('react-chartjs-2').then(module => ({ default: module.Line })));
const Bar = lazy(() => import('react-chartjs-2').then(module => ({ default: module.Bar })));
const Doughnut = lazy(() => import('react-chartjs-2').then(module => ({ default: module.Doughnut })));
const Radar = lazy(() => import('react-chartjs-2').then(module => ({ default: module.Radar })));

// Lazy load Chart.js itself
const loadChartJS = () => import('chart.js/auto');

const ChartLoadingFallback = () => (
  <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
    <LoadingSpinner message="Loading chart..." size="medium" />
  </div>
);

type ChartType = 'line' | 'bar' | 'doughnut' | 'radar';

interface LazyChartProps {
  type: ChartType;
  data: any;
  options?: any;
  width?: number | string;
  height?: number | string;
}

const LazyChart: React.FC<LazyChartProps> = ({ type, ...props }) => {
  // Load Chart.js on component mount
  React.useEffect(() => {
    loadChartJS();
  }, []);

  const ChartComponent = {
    line: Line,
    bar: Bar,
    doughnut: Doughnut,
    radar: Radar,
  }[type];

  return (
    <Suspense fallback={<ChartLoadingFallback />}>
      <ChartComponent {...props} />
    </Suspense>
  );
};

export default LazyChart;