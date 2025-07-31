# Enhanced UI Component Library

A modern, accessible, and customizable UI component library for the PSScript application. This library provides a set of reusable components with consistent design, advanced features, and excellent developer experience.

## Features

- **Modern Design**: Clean, professional appearance with attention to detail
- **Dark/Light Mode Support**: Seamless integration with the application's theme system
- **Accessibility**: ARIA attributes, keyboard navigation, and screen reader support
- **Customization**: Extensive props for styling and behavior customization
- **TypeScript Support**: Full type definitions for better developer experience
- **Responsive**: Works well on all screen sizes
- **Interactive Effects**: Animations, transitions, and feedback for user interactions

## Components

### Button

A versatile button component with various styles, sizes, and features.

```tsx
import { Button } from '../components/ui-enhanced';

// Basic usage
<Button>Click Me</Button>

// Variants
<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="success">Success</Button>
<Button variant="danger">Danger</Button>
<Button variant="warning">Warning</Button>
<Button variant="info">Info</Button>
<Button variant="ghost">Ghost</Button>

// Sizes
<Button size="xs">Extra Small</Button>
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>
<Button size="xl">Extra Large</Button>

// Features
<Button isLoading>Loading</Button>
<Button leftIcon={<Icon />}>With Left Icon</Button>
<Button rightIcon={<Icon />}>With Right Icon</Button>
<Button rounded="full">Rounded</Button>
<Button fullWidth>Full Width</Button>
<Button disabled>Disabled</Button>
```

### Card

A flexible container component for grouping related content.

```tsx
import { Card } from '../components/ui-enhanced';

// Basic usage
<Card>
  <h2>Card Title</h2>
  <p>Card content goes here.</p>
</Card>

// Variants
<Card variant="default">Default Card</Card>
<Card variant="elevated">Elevated Card</Card>
<Card variant="outlined">Outlined Card</Card>
<Card variant="filled">Filled Card</Card>

// With header and footer
<Card 
  header={<h3>Card Header</h3>}
  footer={<div>Card Footer</div>}
>
  Card content
</Card>

// Interactive cards
<Card hoverable clickable>
  This card has hover and click animations
</Card>

// Styling options
<Card withBorder={false} withShadow>
  Card with shadow but no border
</Card>

<Card padding="lg" rounded="xl">
  Card with custom padding and rounded corners
</Card>
```

### Badge

A small visual indicator for statuses, counts, or labels.

```tsx
import { Badge } from '../components/ui-enhanced';

// Basic usage
<Badge>Label</Badge>

// Variants
<Badge variant="primary">Primary</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="success">Success</Badge>
<Badge variant="danger">Danger</Badge>
<Badge variant="warning">Warning</Badge>
<Badge variant="info">Info</Badge>
<Badge variant="neutral">Neutral</Badge>

// Sizes
<Badge size="xs">XS</Badge>
<Badge size="sm">SM</Badge>
<Badge size="md">MD</Badge>
<Badge size="lg">LG</Badge>

// Count badges
<Badge count={5}>Count</Badge>
<Badge count={100} max={99}>Max Count</Badge>

// Features
<Badge withDot>With Dot</Badge>
<Badge withDot withPulse>With Pulse</Badge>
<Badge withBorder>With Border</Badge>
<Badge withShadow>With Shadow</Badge>
<Badge rounded="none">Square</Badge>
```

### Avatar

A component for displaying user images or initials.

```tsx
import { Avatar } from '../components/ui-enhanced';

// Basic usage with image
<Avatar 
  src="https://example.com/avatar.jpg" 
  alt="User Name" 
/>

// With initials (fallback when no image is provided)
<Avatar name="John Doe" />

// Sizes
<Avatar size="xs" name="John Doe" />
<Avatar size="sm" name="John Doe" />
<Avatar size="md" name="John Doe" />
<Avatar size="lg" name="John Doe" />
<Avatar size="xl" name="John Doe" />
<Avatar size="2xl" name="John Doe" />

// Status indicators
<Avatar name="John Doe" status="online" />
<Avatar name="John Doe" status="offline" />
<Avatar name="John Doe" status="away" />
<Avatar name="John Doe" status="busy" />

// Status position
<Avatar name="John Doe" status="online" statusPosition="top-right" />
<Avatar name="John Doe" status="online" statusPosition="top-left" />
<Avatar name="John Doe" status="online" statusPosition="bottom-right" />
<Avatar name="John Doe" status="online" statusPosition="bottom-left" />

// Styling options
<Avatar name="John Doe" withBorder />
<Avatar name="John Doe" withBorder borderWidth="thick" />
<Avatar name="John Doe" withShadow />
<Avatar name="John Doe" rounded="md" />

// Group avatars
<Avatar isGroup groupCount={5} />
<Avatar isGroup groupCount={125} groupLimit={99} />
```

## Demo Page

Visit the UI Components Demo page at `/ui-components` to see all components in action with various configurations.

## Usage Guidelines

1. **Import Components**: Import components from the `ui-enhanced` directory
2. **Theme Integration**: Components automatically adapt to the current theme
3. **Accessibility**: Ensure proper ARIA attributes and keyboard navigation
4. **Responsive Design**: Test components on different screen sizes
5. **Consistent Styling**: Follow the application's design system

## Future Enhancements

- Additional components (Modal, Dropdown, Tabs, etc.)
- Animation customization options
- Component composition patterns
- Performance optimizations
- Expanded accessibility features
