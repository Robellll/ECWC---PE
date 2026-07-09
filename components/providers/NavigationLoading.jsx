'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import '@/components/ui/AppLoader.css';

function isInternalNavigation(href, pathname) {
  if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
    return false;
  }
  try {
    const next = new URL(href, window.location.origin);
    if (next.origin !== window.location.origin) return false;
    const current = `${pathname}${window.location.search}`;
    const target = `${next.pathname}${next.search}`;
    return target !== current;
  } catch {
    return false;
  }
}

export default function NavigationLoading() {
  const pathname = usePathname();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setPending(false);
  }, [pathname]);

  useEffect(() => {
    const onClick = (event) => {
      const anchor = event.target.closest('a');
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      if (isInternalNavigation(anchor.getAttribute('href'), pathname)) {
        setPending(true);
      }
    };

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [pathname]);

  if (!pending) return null;

  return (
    <div className="nav-progress" aria-hidden="true">
      <div className="nav-progress-bar" />
    </div>
  );
}
