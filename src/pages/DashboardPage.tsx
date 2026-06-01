import React, { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { setClerkTokenFetcher } from '../api/axiosClient';
import Shell from '../components/layout/Shell';

export default function DashboardPage() {
  const { getToken } = useAuth();

  useEffect(() => {
    // Dynamically map the Clerk JWT token fetcher to our Central Axios interceptor
    setClerkTokenFetcher(async () => {
      try {
        return await getToken();
      } catch (err) {
        console.error('Failed to resolve Clerk token inside interceptor:', err);
        return null;
      }
    });
  }, [getToken]);

  return <Shell />;
}
