import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './app/App';
import { AuthProvider } from './features/auth/AuthContext';
import { PrototypeProvider } from './prototype/student/PrototypeProvider';
import { ConsumerProvider } from './prototype/consumer/state/ConsumerProvider';
import './shared/i18n';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <PrototypeProvider>
          <ConsumerProvider>
            <App />
          </ConsumerProvider>
        </PrototypeProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
