import React, { Component, ErrorInfo, ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, fontFamily: 'monospace', color: '#c00' }}>
          <strong>App crashed:</strong>
          <pre style={{ whiteSpace: 'pre-wrap', marginTop: 8, fontSize: 12 }}>
            {this.state.error.message}
            {'\n'}
            {this.state.error.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
import { ClerkProvider, useAuth } from '@clerk/clerk-react';
import SignInPage from './pages/SignInPage';
import SignUpPage from './pages/SignUpPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import DashboardPage from './pages/DashboardPage';
import BatchSelectionPage from './pages/BatchSelectionPage';
import { setClerkTokenFetcher } from './api/axiosClient';

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || 'pk_test_bW9jay1jbGVyay1rZXktMTAwLmNsZXJrLmFjY291bnRzLmRldiQ';

import api from './api';

const STORAGE_KEY = 'ips_api_key';

function ClerkTokenBridge() {
  const { getToken, isSignedIn } = useAuth();

  React.useEffect(() => {
    setClerkTokenFetcher((options) => getToken(options));
  }, [getToken]);

  React.useEffect(() => {
    if (!isSignedIn) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    if (localStorage.getItem(STORAGE_KEY)) return;

    void (async () => {
      try {
        const jwt = await getToken({ skipCache: true });
        if (!jwt) return;
        const res = await api.exchangeToken('web-app', jwt);
        if (res?.access_token) {
          localStorage.setItem(STORAGE_KEY, res.access_token);
        }
      } catch (e) {
        localStorage.removeItem(STORAGE_KEY);
        console.warn('API key exchange notice (falling back to Clerk JWT):', e);
      }
    })();
  }, [isSignedIn, getToken]);

  return null;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return null;
  if (!isSignedIn) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return null;
  if (isSignedIn) return <Navigate to="/batch-select" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <ErrorBoundary>
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <ClerkTokenBridge />
      <BrowserRouter>
        <Routes>
          <Route path="/"        element={<GuestRoute><SignInPage /></GuestRoute>} />
          <Route path="/sign-in" element={<GuestRoute><SignInPage /></GuestRoute>} />
          <Route path="/sign-up" element={<GuestRoute><SignUpPage /></GuestRoute>} />
          <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />

          {/* Batch selection — shown immediately after login */}
          <Route path="/batch-select" element={<ProtectedRoute><BatchSelectionPage /></ProtectedRoute>} />

          {/* Redirect bare /dashboard to batch selection */}
          <Route path="/dashboard" element={<Navigate to="/batch-select" replace />} />

          <Route path="/dashboard/:tab"         element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/dashboard/:tab/:subtab" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ClerkProvider>
    </ErrorBoundary>
  );
}
