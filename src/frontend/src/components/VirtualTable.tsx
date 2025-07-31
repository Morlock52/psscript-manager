import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

interface Column<T> {
  key: string;
  header: string;
  width?: number | string;
  minWidth?: number;
  render: (item: T, index: number) => React.ReactNode;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
}

interface VirtualTableProps<T> {
  data: T[];
  columns: Column<T>[];
  rowHeight?: number;
  headerHeight?: number;
  containerHeight?: number;
  className?: string;
  onRowClick?: (item: T, index: number) => void;
  onRowSelect?: (item: T, index: number, selected: boolean) => void;
  selectedRows?: Set<number>;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
  overscan?: number;
  loadMoreItems?: () => void;
  hasNextPage?: boolean;
  isLoading?: boolean;
  itemKey?: (item: T, index: number) => string | number;
  emptyMessage?: string;
}

const VirtualTable = <T,>({
  data,
  columns,
  rowHeight = 60,
  headerHeight = 48,
  containerHeight = 400,
  className = '',
  onRowClick,
  onRowSelect,
  selectedRows,
  sortBy,
  sortDirection,
  onSort,
  overscan = 5,
  loadMoreItems,
  hasNextPage = false,
  isLoading = false,
  itemKey,
  emptyMessage = 'No data available'
}: VirtualTableProps<T>) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollElementRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const availableHeight = containerHeight - headerHeight;
    const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const visibleCount = Math.ceil(availableHeight / rowHeight);
    const end = Math.min(data.length - 1, start + visibleCount + overscan * 2);
    
    return { start, end: Math.max(start, end) };
  }, [scrollTop, containerHeight, headerHeight, rowHeight, overscan, data.length]);

  const totalHeight = data.length * rowHeight;

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const newScrollTop = target.scrollTop;
    const newScrollLeft = target.scrollLeft;
    
    if (newScrollTop !== scrollTop) {
      setScrollTop(newScrollTop);
      
      // Load more items when near bottom
      if (
        hasNextPage &&
        !isLoading &&
        loadMoreItems &&
        newScrollTop + containerHeight - headerHeight >= totalHeight - (rowHeight * 3)
      ) {
        loadMoreItems();
      }
    }
    
    if (newScrollLeft !== scrollLeft) {
      setScrollLeft(newScrollLeft);
      // Sync header scroll
      if (headerRef.current) {
        headerRef.current.scrollLeft = newScrollLeft;
      }
    }
  }, [scrollTop, scrollLeft, hasNextPage, isLoading, loadMoreItems, totalHeight, containerHeight, headerHeight, rowHeight]);

  // Handle sort
  const handleSort = useCallback((column: Column<T>) => {
    if (!column.sortable || !onSort) return;
    
    const newDirection = sortBy === column.key && sortDirection === 'asc' ? 'desc' : 'asc';
    onSort(column.key, newDirection);
  }, [sortBy, sortDirection, onSort]);

  // Handle row selection
  const handleRowSelect = useCallback((item: T, index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (onRowSelect) {
      onRowSelect(item, index, e.target.checked);
    }
  }, [onRowSelect]);

  // Handle row click
  const handleRowClick = useCallback((item: T, index: number) => {
    if (onRowClick) {
      onRowClick(item, index);
    }
  }, [onRowClick]);

  // Calculate column widths
  const totalColumnWidth = useMemo(() => {
    return columns.reduce((total, col) => {
      if (typeof col.width === 'number') {
        return total + col.width;
      }
      return total + (col.minWidth || 150);
    }, 0);
  }, [columns]);

  // Render table header
  const renderHeader = () => (
    <div
      ref={headerRef}
      className="virtual-table-header bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 overflow-hidden"
      style={{
        height: headerHeight,
        minWidth: totalColumnWidth,
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}
    >
      <div className="flex">
        {onRowSelect && (
          <div
            className="flex items-center justify-center border-r border-gray-200 dark:border-gray-600"
            style={{ width: 48, minWidth: 48 }}
          >
            <input
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              aria-label="Select all rows"
              onChange={(e) => {
                // Handle select all
                data.forEach((item, index) => {
                  onRowSelect(item, index, e.target.checked);
                });
              }}
            />
          </div>
        )}
        
        {columns.map((column) => (
          <div
            key={column.key}
            className={`flex items-center px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-600 last:border-r-0 ${
              column.sortable ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600' : ''
            }`}
            style={{
              width: column.width || column.minWidth || 150,
              minWidth: column.minWidth || 100,
              textAlign: column.align || 'left'
            }}
            onClick={() => handleSort(column)}
          >
            <span className="truncate">{column.header}</span>
            {column.sortable && sortBy === column.key && (
              <span className="ml-2">
                {sortDirection === 'asc' ? '↑' : '↓'}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  // Render table rows
  const renderRows = () => {
    const rows = [];
    
    for (let i = visibleRange.start; i <= visibleRange.end; i++) {
      if (i < data.length) {
        const item = data[i];
        const key = itemKey ? itemKey(item, i) : i;
        const isSelected = selectedRows?.has(i) || false;
        
        rows.push(
          <div
            key={key}
            className={`virtual-table-row flex border-b border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 ${
              isSelected ? 'bg-blue-50 dark:bg-blue-900' : 'bg-white dark:bg-gray-800'
            } ${onRowClick ? 'cursor-pointer' : ''}`}
            style={{
              position: 'absolute',
              top: i * rowHeight,
              left: 0,
              right: 0,
              height: rowHeight,
              minWidth: totalColumnWidth
            }}
            onClick={() => handleRowClick(item, i)}
            role="row"
            aria-rowindex={i + 1}
            aria-selected={isSelected}
          >
            {onRowSelect && (
              <div
                className="flex items-center justify-center border-r border-gray-200 dark:border-gray-600"
                style={{ width: 48, minWidth: 48 }}
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  checked={isSelected}
                  onChange={(e) => handleRowSelect(item, i, e)}
                  aria-label={`Select row ${i + 1}`}
                />
              </div>
            )}
            
            {columns.map((column) => (
              <div
                key={column.key}
                className="flex items-center px-4 py-3 border-r border-gray-200 dark:border-gray-600 last:border-r-0 overflow-hidden"
                style={{
                  width: column.width || column.minWidth || 150,
                  minWidth: column.minWidth || 100,
                  textAlign: column.align || 'left'
                }}
                role="cell"
              >
                <div className="truncate w-full">
                  {column.render(item, i)}
                </div>
              </div>
            ))}
          </div>
        );
      }
    }
    
    return rows;
  };

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const currentIndex = Math.floor(scrollTop / rowHeight);
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (currentIndex < data.length - 1) {
          const newScrollTop = (currentIndex + 1) * rowHeight;
          scrollElementRef.current?.scrollTo({ top: newScrollTop, behavior: 'smooth' });
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (currentIndex > 0) {
          const newScrollTop = (currentIndex - 1) * rowHeight;
          scrollElementRef.current?.scrollTo({ top: newScrollTop, behavior: 'smooth' });
        }
        break;
      case 'PageDown':
        e.preventDefault();
        const pageDownIndex = Math.min(
          data.length - 1,
          currentIndex + Math.floor((containerHeight - headerHeight) / rowHeight)
        );
        scrollElementRef.current?.scrollTo({ 
          top: pageDownIndex * rowHeight, 
          behavior: 'smooth' 
        });
        break;
      case 'PageUp':
        e.preventDefault();
        const pageUpIndex = Math.max(
          0,
          currentIndex - Math.floor((containerHeight - headerHeight) / rowHeight)
        );
        scrollElementRef.current?.scrollTo({ 
          top: pageUpIndex * rowHeight, 
          behavior: 'smooth' 
        });
        break;
      case 'Home':
        e.preventDefault();
        scrollElementRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        break;
      case 'End':
        e.preventDefault();
        scrollElementRef.current?.scrollTo({ 
          top: totalHeight, 
          behavior: 'smooth' 
        });
        break;
    }
  }, [scrollTop, rowHeight, data.length, containerHeight, headerHeight, totalHeight]);

  if (data.length === 0) {
    return (
      <div 
        className={`virtual-table-empty ${className}`}
        style={{ height: containerHeight }}
      >
        <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
          {emptyMessage}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`virtual-table ${className} border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden`}
      style={{ height: containerHeight }}
      role="table"
      aria-label={`Virtual table with ${data.length} rows`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {renderHeader()}
      
      <div
        ref={scrollElementRef}
        className="virtual-table-body overflow-auto"
        style={{
          height: containerHeight - headerHeight,
          position: 'relative'
        }}
        onScroll={handleScroll}
        role="rowgroup"
      >
        <div
          style={{
            height: totalHeight,
            position: 'relative',
            minWidth: totalColumnWidth
          }}
        >
          {renderRows()}
          
          {/* Loading indicator */}
          {isLoading && (
            <div
              className="absolute left-0 right-0 flex items-center justify-center bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600"
              style={{
                top: totalHeight,
                height: rowHeight
              }}
            >
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Loading more rows...</span>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Accessibility: Screen reader info */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        Showing rows {visibleRange.start + 1} to {visibleRange.end + 1} of {data.length}
      </div>
    </div>
  );
};

export default VirtualTable;