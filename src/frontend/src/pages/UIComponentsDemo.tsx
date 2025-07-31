import React, { useState } from 'react';
import { useTheme } from '../hooks/useTheme';
import { 
  Button, 
  Card, 
  Badge, 
  Avatar,
  ButtonVariant,
  ButtonSize,
  CardVariant,
  BadgeVariant,
  BadgeSize,
  AvatarSize,
  AvatarStatus
} from '../components/ui-enhanced';

const UIComponentsDemo: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  
  // Button demo state
  const [isLoading, setIsLoading] = useState(false);
  const buttonVariants: ButtonVariant[] = ['primary', 'secondary', 'success', 'danger', 'warning', 'info', 'ghost'];
  const buttonSizes: ButtonSize[] = ['xs', 'sm', 'md', 'lg', 'xl'];
  
  // Card demo state
  const cardVariants: CardVariant[] = ['default', 'elevated', 'outlined', 'filled'];
  
  // Badge demo state
  const badgeVariants: BadgeVariant[] = ['primary', 'secondary', 'success', 'danger', 'warning', 'info', 'neutral'];
  const badgeSizes: BadgeSize[] = ['xs', 'sm', 'md', 'lg'];
  
  // Avatar demo state
  const avatarSizes: AvatarSize[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
  const avatarStatuses: AvatarStatus[] = ['online', 'offline', 'away', 'busy', 'none'];
  
  // Handle loading button click
  const handleLoadingClick = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 2000);
  };

  return (
    <div className={`p-6 ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">UI Components Demo</h1>
          <Button 
            variant={isDark ? 'secondary' : 'primary'} 
            onClick={toggleTheme}
            leftIcon={
              isDark ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )
            }
          >
            {isDark ? 'Light Mode' : 'Dark Mode'}
          </Button>
        </div>

        {/* Buttons Section */}
        <section className="mb-12">
          <Card className="mb-6">
            <h2 className="text-2xl font-bold mb-4">Buttons</h2>
            <p className="mb-6 opacity-75">
              Enhanced button components with various styles, sizes, and features like loading states, icons, and ripple effects.
            </p>
            
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-3">Button Variants</h3>
              <div className="flex flex-wrap gap-3">
                {buttonVariants.map(variant => (
                  <Button key={variant} variant={variant}>
                    {variant.charAt(0).toUpperCase() + variant.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-3">Button Sizes</h3>
              <div className="flex flex-wrap items-center gap-3">
                {buttonSizes.map(size => (
                  <Button key={size} size={size}>
                    {size.toUpperCase()}
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-3">Button Features</h3>
              <div className="flex flex-wrap gap-3">
                <Button 
                  isLoading={isLoading} 
                  onClick={handleLoadingClick}
                >
                  {isLoading ? 'Loading...' : 'Loading State'}
                </Button>
                
                <Button 
                  leftIcon={
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  }
                >
                  Left Icon
                </Button>
                
                <Button 
                  rightIcon={
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  }
                >
                  Right Icon
                </Button>
                
                <Button rounded="full">Rounded Full</Button>
                
                <Button fullWidth className="max-w-xs">Full Width</Button>
                
                <Button disabled>Disabled</Button>
              </div>
            </div>
          </Card>
        </section>

        {/* Cards Section */}
        <section className="mb-12">
          <Card className="mb-6">
            <h2 className="text-2xl font-bold mb-4">Cards</h2>
            <p className="mb-6 opacity-75">
              Versatile card components with various styles, headers, footers, and interactive features.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {cardVariants.map(variant => (
                <Card 
                  key={variant}
                  variant={variant}
                  header={<h3 className="text-lg font-semibold">{variant.charAt(0).toUpperCase() + variant.slice(1)} Card</h3>}
                  footer={<div className="text-right text-sm opacity-75">Card Footer</div>}
                >
                  <p className="py-4">
                    This is a {variant} card with header and footer.
                    Cards can contain any content and are highly customizable.
                  </p>
                </Card>
              ))}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card hoverable clickable>
                <h3 className="text-lg font-semibold mb-2">Hoverable Card</h3>
                <p>This card has hover and click animations.</p>
              </Card>
              
              <Card withBorder={false} withShadow>
                <h3 className="text-lg font-semibold mb-2">Shadow Card</h3>
                <p>This card has shadow but no border.</p>
              </Card>
              
              <Card padding="lg" rounded="xl">
                <h3 className="text-lg font-semibold mb-2">Custom Padding</h3>
                <p>This card has larger padding and extra rounded corners.</p>
              </Card>
            </div>
          </Card>
        </section>

        {/* Badges Section */}
        <section className="mb-12">
          <Card className="mb-6">
            <h2 className="text-2xl font-bold mb-4">Badges</h2>
            <p className="mb-6 opacity-75">
              Badges for displaying status, counts, or labels with various styles and sizes.
            </p>
            
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-3">Badge Variants</h3>
              <div className="flex flex-wrap gap-3">
                {badgeVariants.map(variant => (
                  <Badge key={variant} variant={variant}>
                    {variant}
                  </Badge>
                ))}
              </div>
            </div>
            
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-3">Badge Sizes</h3>
              <div className="flex flex-wrap items-center gap-3">
                {badgeSizes.map(size => (
                  <Badge key={size} size={size}>
                    {size}
                  </Badge>
                ))}
              </div>
            </div>
            
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-3">Badge Features</h3>
              <div className="flex flex-wrap gap-3 items-center">
                <Badge count={5}>Count</Badge>
                <Badge count={100} max={99}>Max Count</Badge>
                <Badge withDot>With Dot</Badge>
                <Badge withDot withPulse>With Pulse</Badge>
                <Badge withBorder>With Border</Badge>
                <Badge withShadow>With Shadow</Badge>
                <Badge rounded="none">Square</Badge>
              </div>
            </div>
          </Card>
        </section>

        {/* Avatars Section */}
        <section className="mb-12">
          <Card className="mb-6">
            <h2 className="text-2xl font-bold mb-4">Avatars</h2>
            <p className="mb-6 opacity-75">
              Avatar components for displaying user images or initials with various sizes and statuses.
            </p>
            
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-3">Avatar Sizes</h3>
              <div className="flex flex-wrap items-end gap-4">
                {avatarSizes.map(size => (
                  <Avatar 
                    key={size} 
                    size={size} 
                    name="John Doe"
                  />
                ))}
              </div>
            </div>
            
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-3">Avatar with Image</h3>
              <div className="flex flex-wrap items-end gap-4">
                {avatarSizes.map(size => (
                  <Avatar 
                    key={size} 
                    size={size} 
                    src="https://randomuser.me/api/portraits/men/32.jpg"
                    alt="John Doe"
                  />
                ))}
              </div>
            </div>
            
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-3">Avatar Statuses</h3>
              <div className="flex flex-wrap items-end gap-4">
                {avatarStatuses.map(status => (
                  <div key={status} className="flex flex-col items-center">
                    <Avatar 
                      name="John Doe"
                      status={status}
                    />
                    <span className="mt-2 text-sm">{status}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-3">Avatar Features</h3>
              <div className="flex flex-wrap items-end gap-4">
                <Avatar name="John Doe" withBorder />
                <Avatar name="Jane Smith" withBorder borderWidth="thick" />
                <Avatar name="Bob Johnson" withShadow />
                <Avatar name="Alice Brown" rounded="md" />
                <Avatar isGroup groupCount={5} />
                <Avatar isGroup groupCount={125} groupLimit={99} />
              </div>
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
};

export default UIComponentsDemo;
