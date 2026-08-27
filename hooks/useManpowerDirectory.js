'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import { setActiveStaffDirectory, GARAGE_STAFF_DIRECTORY } from '@/lib/garage-staff';

let cachedDirectory = null;
let inflight = null;

async function loadDirectory() {
  if (cachedDirectory) return cachedDirectory;
  if (inflight) return inflight;
  inflight = apiFetch('/api/manpower/directory')
    .then((data) => {
      const list = Array.isArray(data) && data.length > 0 ? data : GARAGE_STAFF_DIRECTORY;
      cachedDirectory = list;
      setActiveStaffDirectory(list);
      return list;
    })
    .catch(() => {
      cachedDirectory = GARAGE_STAFF_DIRECTORY;
      setActiveStaffDirectory(GARAGE_STAFF_DIRECTORY);
      return GARAGE_STAFF_DIRECTORY;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function invalidateManpowerDirectoryCache() {
  cachedDirectory = null;
}

export function useManpowerDirectory() {
  const [directory, setDirectory] = useState(() => cachedDirectory || GARAGE_STAFF_DIRECTORY);
  const [loading, setLoading] = useState(!cachedDirectory);

  const refresh = useCallback(async () => {
    setLoading(true);
    cachedDirectory = null;
    const list = await loadDirectory();
    setDirectory(list);
    setLoading(false);
    return list;
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadDirectory().then((list) => {
      if (!cancelled) {
        setDirectory(list);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  return { directory, loading, refresh };
}
