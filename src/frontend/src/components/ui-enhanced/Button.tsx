import React, { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react';
import { useTheme } from '../../hooks/useTheme';

// Define variant types
export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'ghost';

// Define size types
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

// Define button props extending HTML button attributes
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  withRipple?: boolean;
}

// Button component with forwardRef for accessibility
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      isLoading = false,
      leftIcon,
      rightIcon,
      rounded = 'md',
      withRipple = true,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const { theme } = useTheme();
    const [ripples, setRipples] = React.useState<{ x: number; y: number; id: number }[]>([]);
    const isDark = theme === 'dark';

    // Handle ripple effect
    const handleRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!withRipple || disabled || isLoading) return;
      
      const button = e.currentTarget;
      const rect = button.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const id = Date.now();
      setRipples([...ripples, { x, y, id }]);
      
      // Remove ripple after animation completes
      setTimeout(() => {
        setRipples(ripples => ripples.filter(ripple => ripple.id !== id));
      }, 600);
    };

    // Get variant styles
    const getVariantStyles = (): string => {
      switch (variant) {
        case 'primary':
          return isDark
            ? 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white'
            : 'bg-blue-500 hover:bg-blue-400 active:bg-blue-600 text-white';
        case 'secondary':
          return isDark
            ? 'bg-gray-700 hover:bg-gray-600 active:bg-gray-800 text-white'
            : 'bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-800';
        case 'success':
          return isDark
            ? 'bg-green-600 hover:bg-green-500 active:bg-green-700 text-white'
            : 'bg-green-500 hover:bg-green-400 active:bg-green-600 text-white';
        case 'danger':
          return isDark
            ? 'bg-red-600 hover:bg-red-500 active:bg-red-700 text-white'
            : 'bg-red-500 hover:bg-red-400 active:bg-red-600 text-white';
        case 'warning':
          return isDark
            ? 'bg-yellow-600 hover:bg-yellow-500 active:bg-yellow-700 text-white'
            : 'bg-yellow-500 hover:bg-yellow-400 active:bg-yellow-600 text-white';
        case 'info':
          return isDark
            ? 'bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white'
            : 'bg-purple-500 hover:bg-purple-400 active:bg-purple-600 text-white';
        case 'ghost':
          return isDark
            ? 'bg-transparent hover:bg-gray-700 text-gray-300 hover:text-white'
            : 'bg-transparent hover:bg-gray-100 text-gray-700 hover:text-gray-900';
        default:
          return isDark
            ? 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white'
            : 'bg-blue-500 hover:bg-blue-400 active:bg-blue-600 text-white';
      }
    };

    // Get size styles
    const getSizeStyles = (): string => {
      switch (size) {
        case 'xs':
          return 'text-xs py-1 px-2';
        case 'sm':
          return 'text-sm py-1.5 px-3';
        case 'md':
          return 'text-sm py-2 px-4';
        case 'lg':
          return 'text-base py-2.5 px-5';
        case 'xl':
          return 'text-lg py-3 px-6';
        default:
          return 'text-sm py-2 px-4';
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
          return 'rounded-md';
      }
    };

    // Get disabled styles
    const getDisabledStyles = (): string => {
      return isDark
        ? 'opacity-50 cursor-not-allowed bg-gray-700 text-gray-300'
        : 'opacity-50 cursor-not-allowed bg-gray-200 text-gray-500';
    };

    return (
      <button
        ref={ref}
        className={`
          relative inline-flex items-center justify-center
          transition-all duration-200 ease-in-out
          font-medium
          ${getSizeStyles()}
          ${getRoundedStyles()}
          ${disabled || isLoading ? getDisabledStyles() : getVariantStyles()}
          ${fullWidth ? 'w-full' : ''}
          ${className}
          focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            isDark ? 'focus:ring-blue-500 focus:ring-offset-gray-800' : 'focus:ring-blue-500 focus:ring-offset-white'
          }
          overflow-hidden
        `}
        disabled={disabled || isLoading}
        onClick={handleRipple}
        {...props}
      >
        {/* Ripple effect */}
        {withRipple &&
          ripples.map(ripple => (
            <span
              key={ripple.id}
              className={`absolute rounded-full transform -translate-x-1/2 -translate-y-1/2 animate-ripple ${
                isDark ? 'bg-white bg-opacity-30' : 'bg-black bg-opacity-10'
              }`}
              style={{
                left: ripple.x,
                top: ripple.y,
                width: '200%',
                paddingBottom: '200%',
              }}
            />
          ))}

        {/* Loading spinner */}
        {isLoading && (
          <span className="absolute inset-0 flex items-center justify-center">
            <svg
              className="animate-spin h-5 w-5 text-current"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </span>
        )}

        {/* Button content */}
        <span className={`flex items-center ${isLoading ? 'invisible' : 'visible'}`}>
          {leftIcon && <span className="mr-2">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="ml-2">{rightIcon}</span>}
        </span>
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
