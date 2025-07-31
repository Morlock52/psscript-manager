import React, { HTMLAttributes, ReactNode } from 'react';
import { useTheme } from '../../hooks/useTheme';

// Define badge variants
export type BadgeVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'neutral';

// Define badge sizes
export type BadgeSize = 'xs' | 'sm' | 'md' | 'lg';

// Define badge props
export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  withBorder?: boolean;
  withDot?: boolean;
  withPulse?: boolean;
  withShadow?: boolean;
  count?: number;
  max?: number;
  showZero?: boolean;
  invisible?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  rounded = 'full',
  withBorder = false,
  withDot = false,
  withPulse = false,
  withShadow = false,
  count,
  max = 99,
  showZero = false,
  invisible = false,
  className = '',
  ...props
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // If count is provided and it's 0 and showZero is false, hide the badge
  if (count !== undefined && count === 0 && !showZero) {
    return null;
  }

  // If invisible is true, hide the badge
  if (invisible) {
    return null;
  }

  // Format count with max
  const formattedCount = count !== undefined
    ? count > max
      ? `${max}+`
      : count.toString()
    : undefined;

  // Get variant styles
  const getVariantStyles = (): string => {
    switch (variant) {
      case 'primary':
        return isDark
          ? 'bg-blue-600 text-white'
          : 'bg-blue-500 text-white';
      case 'secondary':
        return isDark
          ? 'bg-gray-600 text-white'
          : 'bg-gray-500 text-white';
      case 'success':
        return isDark
          ? 'bg-green-600 text-white'
          : 'bg-green-500 text-white';
      case 'danger':
        return isDark
          ? 'bg-red-600 text-white'
          : 'bg-red-500 text-white';
      case 'warning':
        return isDark
          ? 'bg-yellow-600 text-white'
          : 'bg-yellow-500 text-white';
      case 'info':
        return isDark
          ? 'bg-purple-600 text-white'
          : 'bg-purple-500 text-white';
      case 'neutral':
        return isDark
          ? 'bg-gray-700 text-gray-200'
          : 'bg-gray-200 text-gray-800';
      default:
        return isDark
          ? 'bg-blue-600 text-white'
          : 'bg-blue-500 text-white';
    }
  };

  // Get size styles
  const getSizeStyles = (): string => {
    switch (size) {
      case 'xs':
        return 'text-xs px-1.5 py-0.5 min-w-[1.25rem] h-[1.25rem]';
      case 'sm':
        return 'text-xs px-2 py-0.5 min-w-[1.5rem] h-[1.5rem]';
      case 'md':
        return 'text-sm px-2.5 py-0.5 min-w-[1.75rem] h-[1.75rem]';
      case 'lg':
        return 'text-base px-3 py-1 min-w-[2rem] h-[2rem]';
      default:
        return 'text-sm px-2.5 py-0.5 min-w-[1.75rem] h-[1.75rem]';
    }
  };

  // Get rounded styles
  const getRoundedStyles = (): string => {
    switch (rounded) {
      case 'none':
        return 'rounded-none';
      case 'sm':
        return 'rounded-sm';
      case 'md':
        return 'rounded-md';
      case 'lg':
        return 'rounded-lg';
      case 'full':
        return 'rounded-full';
      default:
        return 'rounded-full';
    }
  };

  // Get border styles
  const getBorderStyles = (): string => {
    if (!withBorder) return '';
    
    return isDark
      ? 'border border-gray-700'
      : 'border border-gray-200';
  };

  // Get shadow styles
  const getShadowStyles = (): string => {
    if (!withShadow) return '';
    
    return isDark
      ? 'shadow-sm shadow-black/30'
      : 'shadow-sm shadow-black/10';
  };

  // Get dot styles
  const getDotStyles = (): string => {
    if (!withDot) return '';
    
    const dotColor = (() => {
      switch (variant) {
        case 'primary':
          return isDark ? 'bg-blue-400' : 'bg-blue-400';
        case 'secondary':
          return isDark ? 'bg-gray-400' : 'bg-gray-400';
        case 'success':
          return isDark ? 'bg-green-400' : 'bg-green-400';
        case 'danger':
          return isDark ? 'bg-red-400' : 'bg-red-400';
        case 'warning':
          return isDark ? 'bg-yellow-400' : 'bg-yellow-400';
        case 'info':
          return isDark ? 'bg-purple-400' : 'bg-purple-400';
        case 'neutral':
          return isDark ? 'bg-gray-400' : 'bg-gray-400';
        default:
          return isDark ? 'bg-blue-400' : 'bg-blue-400';
      }
    })();
    
    const dotSize = (() => {
      switch (size) {
        case 'xs':
          return 'w-1 h-1';
        case 'sm':
          return 'w-1.5 h-1.5';
        case 'md':
          return 'w-2 h-2';
        case 'lg':
          return 'w-2.5 h-2.5';
        default:
          return 'w-2 h-2';
      }
    })();
    
    return `before:content-[''] before:block before:absolute before:top-1/2 before:-translate-y-1/2 before:-left-1 before:${dotSize} before:rounded-full before:${dotColor} ${withPulse ? `before:animate-pulse` : ''}`;
  };

  return (
    <span
      className={`
        inline-flex items-center justify-center
        font-medium
        ${getSizeStyles()}
        ${getRoundedStyles()}
        ${getVariantStyles()}
        ${getBorderStyles()}
        ${getShadowStyles()}
        ${withDot ? 'relative pl-3' : ''}
        ${getDotStyles()}
        ${className}
      `}
      {...props}
    >
      {formattedCount !== undefined ? formattedCount : children}
    </span>
  );
};

export default Badge;
