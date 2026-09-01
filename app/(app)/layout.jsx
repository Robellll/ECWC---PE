'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import AppLoader from '@/components/ui/AppLoader';
import '@/components/layout/MainLayout.css';

const SESSION_TIMEOUT_MS = 12_000;

export default function AppLayout({ children }) {
  const { status } = useSession();
  const router = useRouter();
  const [sessionTimedOut, setSessionTimedOut] = useState(false);

  useEffect(() => {
    if (status !== 'loading') {
      setSessionTimedOut(false);
      return undefined;
    }
    const timer = setTimeout(() => setSessionTimedOut(true), SESSION_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [status]);

  useEffect(() => {
    if (status === 'unauthenticated' || sessionTimedOut) {
      router.replace('/login');
    }
  }, [status, sessionTimedOut, router]);

  if (status === 'loading' && !sessionTimedOut) {
    return <AppLoader label="Starting ECWC Plant & Equipment…" variant="fullscreen" />;
  }

  if (status === 'unauthenticated' || sessionTimedOut) return null;

  return (
    <div className="layout-container">
      <Sidebar />
      <div className="main-wrapper">
        <Header />
        <main className="content-area">{children}</main>
      </div>
    </div>
  );
}
