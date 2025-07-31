import React, { HTMLAttributes, forwardRef, ReactNode } from 'react';
import { useTheme } from '../../hooks/useTheme';

// Define card variants
export type CardVariant = 'default' | 'elevated' | 'outlined' | 'filled';

// Define card props
export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: CardVariant;
  hoverable?: boolean;
  clickable?: boolean;
  withBorder?: boolean;
  withShadow?: boolean;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  header?: ReactNode;
  footer?: ReactNode;
  headerClassName?: string;
  footerClassName?: string;
  bodyClassName?: string;
}

// Card component with forwardRef for accessibility
export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      variant = 'default',
      hoverable = false,
      clickable = false,
      withBorder = true,
      withShadow = true,
      rounded = 'lg',
      padding = 'md',
      header,
      footer,
      headerClassName = '',
      footerClassName = '',
      bodyClassName = '',
      className = '',
      ...props
    },
    ref
  ) => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    // Get variant styles
    const getVariantStyles = (): string => {
      switch (variant) {
        case 'default':
          return isDark
            ? 'bg-gray-800 text-white'
            : 'bg-white text-gray-900';
        case 'elevated':
          return isDark
            ? 'bg-gray-800 text-white shadow-lg'
            : 'bg-white text-gray-900 shadow-lg';
        case 'outlined':
          return isDark
            ? 'bg-transparent text-white border border-gray-700'
            : 'bg-transparent text-gray-900 border border-gray-200';
        case 'filled':
          return isDark
            ? 'bg-gray-700 text-white'
            : 'bg-gray-100 text-gray-900';
        default:
          return isDark
            ? 'bg-gray-800 text-white'
            : 'bg-white text-gray-900';
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
        case 'xl':
          return 'rounded-xl';
        default:
          return 'rounded-lg';
      }
    };

    // Get padding styles
    const getPaddingStyles = (): string => {
      switch (padding) {
        case 'none':
          return 'p-0';
        case 'sm':
          return 'p-3';
        case 'md':
          return 'p-4';
        case 'lg':
          return 'p-6';
        case 'xl':
          return 'p-8';
        default:
          return 'p-4';
      }
    };

    // Get header padding styles
    const getHeaderPaddingStyles = (): string => {
      switch (padding) {
        case 'none':
          return 'px-0 py-0';
        case 'sm':
          return 'px-3 py-2';
        case 'md':
          return 'px-4 py-3';
        case 'lg':
          return 'px-6 py-4';
        case 'xl':
          return 'px-8 py-5';
        default:
          return 'px-4 py-3';
      }
    };

    // Get footer padding styles
    const getFooterPaddingStyles = (): string => {
      switch (padding) {
        case 'none':
          return 'px-0 py-0';
        case 'sm':
          return 'px-3 py-2';
        case 'md':
          return 'px-4 py-3';
        case 'lg':
          return 'px-6 py-4';
        case 'xl':
          return 'px-8 py-5';
        default:
          return 'px-4 py-3';
      }
    };

    // Get body padding styles
    const getBodyPaddingStyles = (): string => {
      if (padding === 'none') return 'p-0';
      
      // If there's a header or footer, adjust padding
      if (header || footer) {
        switch (padding) {
          case 'sm':
            return 'px-3 py-2';
          case 'md':
            return 'px-4 py-3';
          case 'lg':
            return 'px-6 py-4';
          case 'xl':
            return 'px-8 py-5';
          default:
            return 'px-4 py-3';
        }
      }
      
      // Default padding if no header or footer
      return getPaddingStyles();
    };

    // Get border styles
    const getBorderStyles = (): string => {
      if (!withBorder) return '';
      
      return isDark
        ? variant === 'outlined' ? '' : 'border border-gray-700'
        : variant === 'outlined' ? '' : 'border border-gray-200';
    };

    // Get shadow styles
    const getShadowStyles = (): string => {
      if (!withShadow) return '';
      if (variant === 'elevated') return '';
      
      return isDark
        ? 'shadow-md shadow-gray-900/20'
        : 'shadow-md shadow-gray-200/50';
    };

    // Get hover styles
    const getHoverStyles = (): string => {
      if (!hoverable) return '';
      
      return isDark
        ? 'transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg'
        : 'transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg';
    };

    // Get clickable styles
    const getClickableStyles = (): string => {
      if (!clickable) return '';
      
      return isDark
        ? 'cursor-pointer active:scale-95 transition-transform duration-200'
        : 'cursor-pointer active:scale-95 transition-transform duration-200';
    };

    return (
      <div
        ref={ref}
        className={`
          overflow-hidden
          ${getVariantStyles()}
          ${getRoundedStyles()}
          ${getBorderStyles()}
          ${getShadowStyles()}
          ${getHoverStyles()}
          ${getClickableStyles()}
          ${className}
        `}
        {...props}
      >
        {/* Card Header */}
        {header && (
          <div
            className={`
              ${getHeaderPaddingStyles()}
              ${isDark ? 'border-b border-gray-700' : 'border-b border-gray-200'}
              ${headerClassName}
            `}
          >
            {header}
          </div>
        )}

        {/* Card Body */}
        <div
          className={`
            ${getBodyPaddingStyles()}
            ${bodyClassName}
          `}
        >
          {children}
        </div>

        {/* Card Footer */}
        {footer && (
          <div
            className={`
              ${getFooterPaddingStyles()}
              ${isDark ? 'border-t border-gray-700' : 'border-t border-gray-200'}
              ${footerClassName}
            `}
          >
            {footer}
          </div>
        )}
      </div>
    );
  }
);

Card.displayName = 'Card';

export default Card;
