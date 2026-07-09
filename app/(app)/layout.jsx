'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import AppLoader from '@/components/ui/AppLoader';
import '@/components/layout/MainLayout.css';

export default function AppLayout({ children }) {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return <AppLoader label="Starting ECWC Plant & Equipment…" variant="fullscreen" />;
  }

  if (status === 'unauthenticated') return null;

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
