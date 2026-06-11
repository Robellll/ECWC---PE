'use client';

import { useSession } from 'next-auth/react';
import { getRolePermissions } from '@/lib/permissions';

export function usePermissions() {
  const { data: session } = useSession();
  const role = session?.user?.role || '';
  return {
    session,
    user: session?.user,
    ...getRolePermissions(role),
  };
}
