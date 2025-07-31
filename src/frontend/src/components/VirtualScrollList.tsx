import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

interface VirtualScrollProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight?: number;
  renderItem: (item: T, index: number, isVisible: boolean) => React.ReactNode;
  overscan?: number;
  className?: string;
  onScroll?: (scrollTop: number) => void;
  loadMoreItems?: () => void;
  hasNextPage?: boolean;
  isLoading?: boolean;
  itemKey?: (item: T, index: number) => string | number;
}

interface VisibleRange {
  start: number;
  end: number;
}

const VirtualScrollList = <T,>({
  items,
  itemHeight,
  containerHeight = 400,
  renderItem,
  overscan = 3,
  className = '',
  onScroll,
  loadMoreItems,
  hasNextPage = false,
  isLoading = false,
  itemKey
}: VirtualScrollProps<T>) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerRect, setContainerRect] = useState<DOMRect | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollElementRef = useRef<HTMLDivElement>(null);
  const lastScrollTop = useRef(0);
  const resizeObserver = useRef<ResizeObserver | null>(null);

  // Calculate visible range with memoization
  const visibleRange = useMemo((): VisibleRange => {
    if (!containerRect) {
      return { start: 0, end: 0 };
    }

    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleItemCount = Math.ceil(containerRect.height / itemHeight);
    const end = Math.min(
      items.length - 1,
      start + visibleItemCount + overscan * 2
    );

    return { start, end: Math.max(start, end) };
  }, [scrollTop, containerRect, itemHeight, overscan, items.length]);

  // Total height of all items
  const totalHeight = items.length * itemHeight;

  // Scroll handler with throttling
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const newScrollTop = target.scrollTop;
    
    // Throttle scroll updates
    if (Math.abs(newScrollTop - lastScrollTop.current) >= itemHeight / 4) {
      setScrollTop(newScrollTop);
      lastScrollTop.current = newScrollTop;
      onScroll?.(newScrollTop);

      // Load more items when near bottom
      if (
        hasNextPage &&
        !isLoading &&
        loadMoreItems &&
        newScrollTop + containerRect!.height >= totalHeight - (itemHeight * 5)
      ) {
        loadMoreItems();
      }
    }
  }, [itemHeight, onScroll, hasNextPage, isLoading, loadMoreItems, totalHeight, containerRect]);

  // Setup resize observer
  useEffect(() => {
    if (!containerRef.current) return;

    const currentContainer = containerRef.current;
    const updateContainerRect = () => {
      if (currentContainer) {
        setContainerRect(currentContainer.getBoundingClientRect());
      }
    };

    updateContainerRect();

    let cleanup: (() => void) | undefined;

    if ('ResizeObserver' in window) {
      resizeObserver.current = new ResizeObserver(updateContainerRect);
      resizeObserver.current.observe(currentContainer);
      
      cleanup = () => {
        if (resizeObserver.current) {
          resizeObserver.current.disconnect();
        }
      };
    } else {
      // Fallback for browsers without ResizeObserver
      (window as any).addEventListener('resize', updateContainerRect);
      
      cleanup = () => {
        (window as any).removeEventListener('resize', updateContainerRect);
      };
    }

    return cleanup;
  }, []);

  // Scroll to specific item
  const scrollToItem = useCallback((index: number, behavior: ScrollBehavior = 'smooth') => {
    if (scrollElementRef.current) {
      const scrollTop = index * itemHeight;
      scrollElementRef.current.scrollTo({
        top: scrollTop,
        behavior
      });
    }
  }, [itemHeight]);

  // Render visible items
  const visibleItems = useMemo(() => {
    const items_to_render = [];
    for (let i = visibleRange.start; i <= visibleRange.end; i++) {
      if (i < items.length) {
        const item = items[i];
        const key = itemKey ? itemKey(item, i) : i;
        const isVisible = i >= visibleRange.start + overscan && i <= visibleRange.end - overscan;
        
        items_to_render.push(
          <div
            key={key}
            style={{
              position: 'absolute',
              top: i * itemHeight,
              left: 0,
              right: 0,
              height: itemHeight,
            }}
            data-index={i}
          >
            {renderItem(item, i, isVisible)}
          </div>
        );
      }
    }
    return items_to_render;
  }, [visibleRange, items, itemHeight, renderItem, itemKey, overscan]);

  // Accessibility: Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const currentIndex = Math.floor(scrollTop / itemHeight);
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        scrollToItem(Math.min(items.length - 1, currentIndex + 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        scrollToItem(Math.max(0, currentIndex - 1));
        break;
      case 'PageDown':
        e.preventDefault();
        const pageDownIndex = Math.min(
          items.length - 1,
          currentIndex + Math.floor(containerHeight / itemHeight)
        );
        scrollToItem(pageDownIndex);
        break;
      case 'PageUp':
        e.preventDefault();
        const pageUpIndex = Math.max(
          0,
          currentIndex - Math.floor(containerHeight / itemHeight)
        );
        scrollToItem(pageUpIndex);
        break;
      case 'Home':
        e.preventDefault();
        scrollToItem(0);
        break;
      case 'End':
        e.preventDefault();
        scrollToItem(items.length - 1);
        break;
    }
  }, [scrollTop, itemHeight, items.length, containerHeight, scrollToItem]);

  return (
    <div
      ref={containerRef}
      className={`virtual-scroll-container ${className}`}
      style={{ height: containerHeight, position: 'relative' }}
      role="listbox"
      aria-label={`Virtual list with ${items.length} items`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={scrollElementRef}
        className="virtual-scroll-content"
        style={{
          height: '100%',
          overflow: 'auto',
          position: 'relative'
        }}
        onScroll={handleScroll}
        role="presentation"
      >
        <div
          style={{
            height: totalHeight,
            position: 'relative'
          }}
        >
          {visibleItems}
          
          {/* Loading indicator */}
          {isLoading && (
            <div
              style={{
                position: 'absolute',
                top: totalHeight,
                left: 0,
                right: 0,
                height: itemHeight,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0, 0, 0, 0.05)'
              }}
            >
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm text-gray-600">Loading more items...</span>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Scrollbar indicators */}
      <div
        className="absolute right-0 top-0 w-1 bg-gray-200 rounded"
        style={{ height: '100%' }}
      >
        <div
          className="bg-blue-500 rounded w-full transition-all duration-200"
          style={{
            height: `${Math.min(100, (containerHeight / totalHeight) * 100)}%`,
            transform: `translateY(${(scrollTop / totalHeight) * containerHeight}px)`
          }}
        />
      </div>
      
      {/* Accessibility: Screen reader info */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        Showing items {visibleRange.start + 1} to {visibleRange.end + 1} of {items.length}
      </div>
    </div>
  );
};

export default VirtualScrollList;