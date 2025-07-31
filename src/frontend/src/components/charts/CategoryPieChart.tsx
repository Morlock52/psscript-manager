import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

// Define Category interface
interface Category {
  id: number;
  name: string;
  description: string;
  count?: number;
  color?: string;
}

// Define props for CategoryPieChart
interface CategoryPieChartProps {
  data: Category[];
  theme: 'light' | 'dark';
}

const CategoryPieChart: React.FC<CategoryPieChartProps> = ({ data, theme }) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  
  // Generate colors for categories
  const generateColors = (count: number) => {
    const baseColors = [
      '#4299E1', // blue-500
      '#48BB78', // green-500
      '#ED8936', // orange-500
      '#9F7AEA', // purple-500
      '#F56565', // red-500
      '#38B2AC', // teal-500
      '#ED64A6', // pink-500
      '#ECC94B', // yellow-500
      '#667EEA', // indigo-500
      '#FC8181', // red-400
    ];
    
    // If we have more categories than base colors, generate additional colors
    if (count <= baseColors.length) {
      return baseColors.slice(0, count);
    }
    
    // Generate additional colors by cycling through the base colors
    const colors = [...baseColors];
    for (let i = baseColors.length; i < count; i++) {
      colors.push(baseColors[i % baseColors.length]);
    }
    
    return colors;
  };
  
  // Create or update chart
  useEffect(() => {
    if (!chartRef.current) return;
    
    // Prepare data for chart
    const categories = data.filter(category => category.count !== undefined && category.count > 0);
    const labels = categories.map(category => category.name);
    const counts = categories.map(category => category.count || 0);
    const colors = categories.map(category => category.color || '');
    
    // Use provided colors or generate new ones
    const chartColors = colors.some(color => color) 
      ? colors.map(color => color || '#4299E1') 
      : generateColors(categories.length);
    
    // Destroy existing chart
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }
    
    // Create new chart
    const ctx = chartRef.current.getContext('2d');
    if (ctx) {
      chartInstance.current = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [
            {
              data: counts,
              backgroundColor: chartColors,
              borderColor: theme === 'dark' ? '#1A202C' : '#FFFFFF',
              borderWidth: 2,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: theme === 'dark' ? '#E2E8F0' : '#2D3748',
                padding: 10,
                usePointStyle: true,
                font: {
                  size: 11,
                },
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
                label: (context) => {
                  const label = context.label || '';
                  const value = context.raw as number;
                  const total = context.dataset.data.reduce((acc: number, curr: number) => acc + curr, 0);
                  const percentage = Math.round((value / total) * 100);
                  return `${label}: ${value} (${percentage}%)`;
                },
              },
            },
          },
          cutout: '60%',
          animation: {
            animateScale: true,
            animateRotate: true,
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
  
  return (
    <div className="w-full h-full">
      {data.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            No category data available
          </p>
        </div>
      ) : (
        <canvas ref={chartRef} />
      )}
    </div>
  );
};

export default CategoryPieChart;
