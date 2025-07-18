// Utility to fix ResizeObserver loop errors
// This is a known browser issue that happens when ResizeObserver 
// notifications can't be delivered in a single animation frame

export const installResizeObserverFix = () => {
  // Store the original error handler
  const originalErrorHandler = window.onerror;

  // Override the global error handler
  window.onerror = function (
    message: string | Event,
    source?: string,
    lineno?: number,
    colno?: number,
    error?: Error
  ): boolean {
    // Check if this is the ResizeObserver error
    if (message && typeof message === 'string' && 
        message.includes('ResizeObserver loop completed with undelivered notifications')) {
      // Suppress this specific error
      return true;
    }
    
    // Also check for the error object
    if (error && error.message && 
        error.message.includes('ResizeObserver loop completed with undelivered notifications')) {
      return true;
    }

    // For all other errors, call the original handler if it exists
    if (originalErrorHandler) {
      return originalErrorHandler(message, source, lineno, colno, error);
    }

    // Let other errors propagate normally
    return false;
  };

  // Also handle unhandled promise rejections that might contain this error
  window.addEventListener('unhandledrejection', function (e) {
    if (e.reason && e.reason.message && 
        e.reason.message.includes('ResizeObserver loop completed with undelivered notifications')) {
      e.preventDefault();
    }
  });
  
  // Handle errors that come through the error event with capture phase
  window.addEventListener('error', function (e) {
    if (e.message && e.message.includes('ResizeObserver loop completed with undelivered notifications')) {
      e.preventDefault();
      e.stopImmediatePropagation();
      return true;
    }
  }, true);

  // Patch the ResizeObserver constructor to handle the error internally
  const OriginalResizeObserver = window.ResizeObserver;
  
  // Create a patched version that suppresses the specific error
  window.ResizeObserver = class PatchedResizeObserver extends OriginalResizeObserver {
    constructor(callback: ResizeObserverCallback) {
      super((entries, observer) => {
        // Use requestAnimationFrame to defer the callback
        // This helps prevent the "loop completed with undelivered notifications" error
        requestAnimationFrame(() => {
          try {
            callback(entries, observer);
          } catch (error) {
            // Only log if it's not the ResizeObserver error
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (!errorMessage.includes('ResizeObserver loop completed with undelivered notifications')) {
              console.error('ResizeObserver callback error:', error);
            }
          }
        });
      });
    }
  } as any;

  // Also create a global error event listener for React's error boundary
  if (typeof window !== 'undefined' && window.addEventListener) {
    const resizeObserverErrorHandler = (e: ErrorEvent) => {
      if (e.message === 'ResizeObserver loop completed with undelivered notifications.') {
        e.stopImmediatePropagation();
        e.preventDefault();
        return false;
      }
    };
    
    // Add to both error and unhandledrejection events
    window.addEventListener('error', resizeObserverErrorHandler);
  }
};

// Debounced ResizeObserver wrapper to prevent the error
export class DebouncedResizeObserver {
  private observer: ResizeObserver;
  private callbacks: Map<Element, ResizeObserverCallback> = new Map();
  private pending = new Set<Element>();
  private frameId: number | null = null;

  constructor() {
    this.observer = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        this.pending.add(entry.target);
      });

      if (this.frameId === null) {
        this.frameId = requestAnimationFrame(() => {
          this.flush();
        });
      }
    });
  }

  observe(element: Element, callback: ResizeObserverCallback) {
    this.callbacks.set(element, callback);
    this.observer.observe(element);
  }

  unobserve(element: Element) {
    this.callbacks.delete(element);
    this.pending.delete(element);
    this.observer.unobserve(element);
  }

  disconnect() {
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
    this.callbacks.clear();
    this.pending.clear();
    this.observer.disconnect();
  }

  private flush() {
    this.frameId = null;
    const entries: ResizeObserverEntry[] = [];

    this.pending.forEach((element) => {
      const callback = this.callbacks.get(element);
      if (callback) {
        // Create a mock ResizeObserverEntry
        const rect = element.getBoundingClientRect();
        const entry = {
          target: element,
          contentRect: rect,
          borderBoxSize: [{ inlineSize: rect.width, blockSize: rect.height }],
          contentBoxSize: [{ inlineSize: rect.width, blockSize: rect.height }],
          devicePixelContentBoxSize: [{ inlineSize: rect.width, blockSize: rect.height }]
        } as ResizeObserverEntry;
        entries.push(entry);
      }
    });

    this.pending.clear();

    // Call callbacks outside of the measurement phase
    entries.forEach((entry) => {
      const callback = this.callbacks.get(entry.target);
      if (callback) {
        try {
          callback([entry], this.observer);
        } catch (error) {
          console.error('Error in ResizeObserver callback:', error);
        }
      }
    });
  }
}