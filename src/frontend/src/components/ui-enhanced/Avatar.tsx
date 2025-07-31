import React, { ImgHTMLAttributes } from 'react';
import { useTheme } from '../../hooks/useTheme';

// Define avatar sizes
export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

// Define avatar status
export type AvatarStatus = 'online' | 'offline' | 'away' | 'busy' | 'none';

// Define avatar props
export interface AvatarProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'size'> {
  src?: string;
  alt?: string;
  name?: string;
  size?: AvatarSize;
  status?: AvatarStatus;
  statusPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  withBorder?: boolean;
  borderColor?: string;
  borderWidth?: 'thin' | 'medium' | 'thick';
  withShadow?: boolean;
  isGroup?: boolean;
  groupCount?: number;
  groupLimit?: number;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = 'Avatar',
  name,
  size = 'md',
  status = 'none',
  statusPosition = 'bottom-right',
  rounded = 'full',
  withBorder = false,
  borderColor,
  borderWidth = 'medium',
  withShadow = false,
  isGroup = false,
  groupCount,
  groupLimit = 99,
  className = '',
  ...props
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Get initials from name
  const getInitials = (): string => {
    if (!name) return '?';
    
    const nameParts = name.split(' ').filter(Boolean);
    
    if (nameParts.length === 0) return '?';
    if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase();
    
    return `${nameParts[0].charAt(0)}${nameParts[nameParts.length - 1].charAt(0)}`.toUpperCase();
  };

  // Get size styles
  const getSizeStyles = (): string => {
    switch (size) {
      case 'xs':
        return 'w-6 h-6 text-xs';
      case 'sm':
        return 'w-8 h-8 text-sm';
      case 'md':
        return 'w-10 h-10 text-base';
      case 'lg':
        return 'w-12 h-12 text-lg';
      case 'xl':
        return 'w-16 h-16 text-xl';
      case '2xl':
        return 'w-20 h-20 text-2xl';
      default:
        return 'w-10 h-10 text-base';
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
    
    const width = (() => {
      switch (borderWidth) {
        case 'thin':
          return 'border';
        case 'medium':
          return 'border-2';
        case 'thick':
          return 'border-4';
        default:
          return 'border-2';
      }
    })();
    
    const color = borderColor || (isDark ? 'border-gray-700' : 'border-white');
    
    return `${width} ${color}`;
  };

  // Get shadow styles
  const getShadowStyles = (): string => {
    if (!withShadow) return '';
    
    return isDark
      ? 'shadow-md shadow-black/30'
      : 'shadow-md shadow-black/10';
  };

  // Get status styles
  const getStatusStyles = (): string => {
    if (status === 'none') return '';
    
    const statusColor = (() => {
      switch (status) {
        case 'online':
          return 'bg-green-500';
        case 'offline':
          return 'bg-gray-500';
        case 'away':
          return 'bg-yellow-500';
        case 'busy':
          return 'bg-red-500';
        default:
          return '';
      }
    })();
    
    const statusSize = (() => {
      switch (size) {
        case 'xs':
          return 'w-1.5 h-1.5';
        case 'sm':
          return 'w-2 h-2';
        case 'md':
          return 'w-2.5 h-2.5';
        case 'lg':
          return 'w-3 h-3';
        case 'xl':
          return 'w-3.5 h-3.5';
        case '2xl':
          return 'w-4 h-4';
        default:
          return 'w-2.5 h-2.5';
      }
    })();
    
    const statusPositionClass = (() => {
      switch (statusPosition) {
        case 'top-right':
          return 'top-0 right-0 transform translate-x-1/4 -translate-y-1/4';
        case 'top-left':
          return 'top-0 left-0 transform -translate-x-1/4 -translate-y-1/4';
        case 'bottom-right':
          return 'bottom-0 right-0 transform translate-x-1/4 translate-y-1/4';
        case 'bottom-left':
          return 'bottom-0 left-0 transform -translate-x-1/4 translate-y-1/4';
        default:
          return 'bottom-0 right-0 transform translate-x-1/4 translate-y-1/4';
      }
    })();
    
    return `after:content-[''] after:absolute after:${statusPositionClass} after:block after:${statusSize} after:${statusColor} after:rounded-full after:ring-2 after:ring-white after:dark:ring-gray-800`;
  };

  // Get background color for placeholder
  const getPlaceholderBgColor = (): string => {
    if (!name) {
      return isDark ? 'bg-gray-700' : 'bg-gray-200';
    }
    
    // Generate a consistent color based on the name
    const hash = name.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    
    const hue = Math.abs(hash % 360);
    
    return `bg-[hsl(${hue},70%,${isDark ? '40%' : '60%'})]`;
  };

  // Render group avatar
  if (isGroup) {
    const displayCount = groupCount !== undefined && groupCount > groupLimit
      ? `${groupLimit}+`
      : groupCount?.toString() || '?';
    
    return (
      <div
        className={`
          relative inline-flex items-center justify-center
          ${getSizeStyles()}
          ${getRoundedStyles()}
          ${getBorderStyles()}
          ${getShadowStyles()}
          ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-800'}
          font-medium
          ${className}
        `}
        title={`Group with ${groupCount} members`}
      >
        {displayCount}
      </div>
    );
  }

  // Render image avatar or placeholder
  return (
    <div
      className={`
        relative inline-block
        ${getSizeStyles()}
        ${getStatusStyles()}
        ${className}
      `}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          className={`
            object-cover
            ${getSizeStyles()}
            ${getRoundedStyles()}
            ${getBorderStyles()}
            ${getShadowStyles()}
          `}
          {...props}
        />
      ) : (
        <div
          className={`
            flex items-center justify-center
            ${getSizeStyles()}
            ${getRoundedStyles()}
            ${getBorderStyles()}
            ${getShadowStyles()}
            ${getPlaceholderBgColor()}
            text-white font-medium
          `}
          title={name || 'User'}
        >
          {getInitials()}
        </div>
      )}
    </div>
  );
};

export default Avatar;
