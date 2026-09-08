import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { LanguageProvider } from './context/LanguageContext';
import './index.css';

function renderApp() {
  let rootElement = document.getElementById('root');
  if (!rootElement) {
    rootElement = document.createElement('div');
    rootElement.id = 'root';
    document.body.appendChild(rootElement);
  }
  createRoot(rootElement).render(
    <StrictMode>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </StrictMode>,
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderApp);
} else {
  renderApp();
}

