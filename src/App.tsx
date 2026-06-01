import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ClerkProvider, SignedIn, SignedOut } from '@clerk/clerk-react';
import SignInPage from './pages/SignInPage';
import SignUpPage from './pages/SignUpPage';
import DashboardPage from './pages/DashboardPage';

// Retrieve Clerk key
const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || 'pk_test_bW9jay1jbGVyay1rZXktMTAwLmNsZXJrLmFjY291bnRzLmRldiQ';

export default function App() {
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <BrowserRouter>
        <Routes>
          {/* Public Custom Auth Routes with SignedIn Redirects */}
          <Route 
            path="/" 
            element={
              <>
                <SignedIn>
                  <Navigate to="/dashboard/talk" replace />
                </SignedIn>
                <SignedOut>
                  <SignInPage />
                </SignedOut>
              </>
            } 
          />
          <Route 
            path="/sign-up" 
            element={
              <>
                <SignedIn>
                  <Navigate to="/dashboard/talk" replace />
                </SignedIn>
                <SignedOut>
                  <SignUpPage />
                </SignedOut>
              </>
            } 
          />

          {/* Proper Nested Dashboard Routes */}
          <Route
            path="/dashboard/:tab"
            element={
              <>
                <SignedIn>
                  <DashboardPage />
                </SignedIn>
                <SignedOut>
                  <Navigate to="/sign-in" replace />
                </SignedOut>
              </>
            }
          />
          <Route
            path="/dashboard/:tab/:subtab"
            element={
              <>
                <SignedIn>
                  <DashboardPage />
                </SignedIn>
                <SignedOut>
                  <Navigate to="/sign-in" replace />
                </SignedOut>
              </>
            }
          />

          {/* Catch-all route to redirect back to default dashboard view */}
          <Route path="*" element={<Navigate to="/dashboard/talk" replace />} />
        </Routes>
      </BrowserRouter>
    </ClerkProvider>
  );
}
