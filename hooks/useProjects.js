'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';

/** Fetch project names from the database (excludes Kanban unassigned row by default). */
export function useProjects({ includeUnassigned = false } = {}) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/projects')
      .then((rows) => {
        const names = rows
          .filter((p) => includeUnassigned || !p.isUnassigned)
          .map((p) => p.name);
        setProjects(names);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [includeUnassigned]);

  return { projects, loading };
}
