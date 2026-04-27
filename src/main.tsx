import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// StrictMode removed: it double-mounts usePipeline in dev,
// firing two concurrent pipeline cycles and double-sending emails.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
);
