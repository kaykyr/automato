# UI Components

This directory contains reusable UI components that replace native browser dialogs and alerts.

## Toast Notifications

Replace native `alert()` calls with toast notifications:

```tsx
import { useToast } from '../../hooks/useToast';

const { toast } = useToast();

// Success notification
toast.success('Flow saved', 'Your flow has been saved successfully');

// Error notification
toast.error('Error saving flow', 'There was an error while saving');

// Info notification
toast.info('New flow created', 'A new flow has been created');

// Warning notification
toast.warning('Please save first', 'You need to save the flow before running it');
```

## Dialog Confirmations

Replace native `confirm()` calls with custom dialogs:

```tsx
import { useDialog } from '../../hooks/useDialog';

const { confirm } = useDialog();

// Confirmation dialog
confirm('Delete Flow', 'Are you sure you want to delete this flow?', () => {
  // Handle confirmation
});
```

## Modal Component

Generic modal component for custom dialogs:

```tsx
import { Modal } from './Modal';

<Modal
  isOpen={isOpen}
  onClose={handleClose}
  title="Modal Title"
  size="medium"
  footer={
    <div>
      <button onClick={handleClose}>Cancel</button>
      <button onClick={handleSave}>Save</button>
    </div>
  }
>
  <p>Modal content goes here</p>
</Modal>
```

## Features

- **Consistent Design**: All components follow the same dark theme design system
- **Animations**: Smooth fade-in/out animations
- **Accessibility**: Proper focus management and keyboard navigation
- **Responsive**: Works well on mobile and desktop
- **Customizable**: Easy to customize colors, sizes, and behavior
- **Type-safe**: Full TypeScript support

## Styling

All components use CSS modules with a consistent color scheme:
- Background: `#1e293b` (dark blue-gray)
- Text: `#f1f5f9` (light gray)
- Borders: `#334155` (medium gray)
- Accent colors: Success (#10b981), Error (#ef4444), Warning (#f59e0b), Info (#3b82f6)