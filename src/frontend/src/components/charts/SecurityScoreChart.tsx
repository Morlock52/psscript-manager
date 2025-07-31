import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

interface SecurityScore {
  score: number;
  count: number;
  percentage: number;
}

interface SecurityScoreChartProps {
  data: SecurityScore[];
  theme: 'light' | 'dark';
}

const SecurityScoreChart: React.FC<SecurityScoreChartProps> = ({ data, theme }) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  
  // Calculate overall security score
  const calculateOverallScore = (scores: SecurityScore[]): number => {
    if (!scores || scores.length === 0) return 0;
    
    const totalScripts = scores.reduce((sum, item) => sum + item.count, 0);
    if (totalScripts === 0) return 0;
    
    const weightedSum = scores.reduce((sum, item) => sum + (item.score * item.count), 0);
    return Math.round((weightedSum / totalScripts) * 10) / 10; // Round to 1 decimal place
  };
  
  // Get color based on score
  const getScoreColor = (score: number): string => {
    if (score >= 8) return '#48BB78'; // green-500
    if (score >= 6) return '#4299E1'; // blue-500
    if (score >= 4) return '#ECC94B'; // yellow-500
    if (score >= 2) return '#ED8936'; // orange-500
    return '#F56565'; // red-500
  };
  
  // Create or update chart
  useEffect(() => {
    if (!chartRef.current || !data || data.length === 0) return;
    
    // Prepare data for chart
    const labels = data.map(item => `Score ${item.score}`);
    const values = data.map(item => item.count);
    const colors = data.map(item => getScoreColor(item.score));
    
    // Destroy existing chart
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }
    
    // Create new chart
    const ctx = chartRef.current.getContext('2d');
    if (ctx) {
      chartInstance.current = new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Scripts',
              data: values,
              backgroundColor: colors,
              borderColor: theme === 'dark' ? '#1A202C' : '#FFFFFF',
              borderWidth: 1,
              borderRadius: 4,
              barPercentage: 0.6,
              categoryPercentage: 0.8,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y', // Horizontal bar chart
          plugins: {
            legend: {
              display: false,
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
                label: (context) => {
                  const index = context.dataIndex;
                  const item = data[index];
                  return `${item.count} scripts (${item.percentage}%)`;
                },
              },
            },
          },
          scales: {
            x: {
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
            y: {
              grid: {
                display: false,
              },
              ticks: {
                color: theme === 'dark' ? '#CBD5E0' : '#4A5568',
                font: {
                  size: 10,
                },
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
  }, [data, theme]);
  
  // Calculate overall score
  const overallScore = calculateOverallScore(data);
  
  // Get color for overall score
  const overallScoreColor = getScoreColor(overallScore);
  
  return (
    <div className="w-full h-full">
      {!data || data.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            No security data available
          </p>
        </div>
      ) : (
        <div className="relative w-full h-full">
          <div className="absolute top-0 right-0 p-2">
            <div className="flex flex-col items-center">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Overall Score</div>
              <div className={`text-2xl font-bold`} style={{ color: overallScoreColor }}>
                {overallScore}/10
              </div>
            </div>
          </div>
          <canvas ref={chartRef} />
        </div>
      )}
    </div>
  );
};

export default SecurityScoreChart;
