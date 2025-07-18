import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { installResizeObserverFix } from './utils/resizeObserverFix';

// Install the ResizeObserver error fix before anything else
installResizeObserverFix();

// Additional check for development environment
if (process.env.NODE_ENV === 'development') {
  // Suppress ResizeObserver errors in console
  const errorHandler = (e: ErrorEvent) => {
    if (e.message?.includes('ResizeObserver loop completed with undelivered notifications')) {
      e.preventDefault();
      e.stopPropagation();
      return true;
    }
  };
  
  window.addEventListener('error', errorHandler, true);
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
