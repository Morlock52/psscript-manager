import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

interface TrendData {
  uploads: { date: string; count: number }[];
  executions: { date: string; count: number }[];
  analyses: { date: string; count: number }[];
}

interface ScriptTrendChartProps {
  data: TrendData;
  theme: 'light' | 'dark';
  period: 'week' | 'month' | 'year';
}

const ScriptTrendChart: React.FC<ScriptTrendChartProps> = ({ data, theme, period }) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  
  // Format date based on period
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    
    if (period === 'year') {
      // For year view, show month name
      return date.toLocaleDateString('en-US', { month: 'short' });
    } else if (period === 'month') {
      // For month view, show day and month
      return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    } else {
      // For week view, show day of week
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    }
  };
  
  // Create or update chart
  useEffect(() => {
    if (!chartRef.current || !data) return;
    
    // Prepare data for chart
    const labels = data.uploads.map(item => formatDate(item.date));
    
    // Destroy existing chart
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }
    
    // Create new chart
    const ctx = chartRef.current.getContext('2d');
    if (ctx) {
      chartInstance.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Uploads',
              data: data.uploads.map(item => item.count),
              borderColor: '#4299E1', // blue-500
              backgroundColor: 'rgba(66, 153, 225, 0.1)',
              borderWidth: 2,
              tension: 0.3,
              pointRadius: 3,
              pointBackgroundColor: '#4299E1',
              fill: true,
            },
            {
              label: 'Executions',
              data: data.executions.map(item => item.count),
              borderColor: '#48BB78', // green-500
              backgroundColor: 'rgba(72, 187, 120, 0.1)',
              borderWidth: 2,
              tension: 0.3,
              pointRadius: 3,
              pointBackgroundColor: '#48BB78',
              fill: true,
            },
            {
              label: 'Analyses',
              data: data.analyses.map(item => item.count),
              borderColor: '#9F7AEA', // purple-500
              backgroundColor: 'rgba(159, 122, 234, 0.1)',
              borderWidth: 2,
              tension: 0.3,
              pointRadius: 3,
              pointBackgroundColor: '#9F7AEA',
              fill: true,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              labels: {
                color: theme === 'dark' ? '#CBD5E0' : '#4A5568',
                padding: 10,
                usePointStyle: true,
                pointStyle: 'circle',
              },
            },
            tooltip: {
              backgroundColor: theme === 'dark' ? '#4A5568' : '#FFFFFF',
              titleColor: theme === 'dark' ? '#FFFFFF' : '#1A202C',
              bodyColor: theme === 'dark' ? '#E2E8F0' : '#4A5568',
              borderColor: theme === 'dark' ? '#2D3748' : '#E2E8F0',
              borderWidth: 1,
              padding: 10,
              displayColors: true,
              callbacks: {
                title: (tooltipItems) => {
                  const index = tooltipItems[0].dataIndex;
                  return data.uploads[index]?.date || '';
                },
              },
            },
          },
          scales: {
            x: {
              grid: {
                color: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
              },
              ticks: {
                color: theme === 'dark' ? '#CBD5E0' : '#4A5568',
                font: {
                  size: 10,
                },
              },
            },
            y: {
              beginAtZero: true,
              grid: {
                color: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
              },
              ticks: {
                color: theme === 'dark' ? '#CBD5E0' : '#4A5568',
                font: {
                  size: 10,
                },
                precision: 0,
              },
            },
          },
        },
      });
    }
    
    // Cleanup
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data, theme, period]);
  
  return (
    <div className="w-full h-full">
      {!data || (data.uploads.length === 0 && data.executions.length === 0 && data.analyses.length === 0) ? (
        <div className="flex items-center justify-center h-full">
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            No trend data available
          </p>
        </div>
      ) : (
        <canvas ref={chartRef} />
      )}
    </div>
  );
};

export default ScriptTrendChart;
