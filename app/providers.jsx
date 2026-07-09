'use client';

import { SessionProvider } from 'next-auth/react';
import NavigationLoading from '@/components/providers/NavigationLoading';

export default function Providers({ children }) {
  return (
    <SessionProvider>
      <NavigationLoading />
      {children}
    </SessionProvider>
  );
}
