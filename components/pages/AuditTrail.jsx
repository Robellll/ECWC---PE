'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ScrollText, ChevronRight, RefreshCw } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { apiFetch } from '@/lib/api-client';
import { AUDIT_MODULE_LABELS } from '@/lib/audit-log-constants';
import './AuditTrail.css';

const MODULE_FILTERS = [
  { id: '', label: 'All' },
  ...Object.entries(AUDIT_MODULE_LABELS).map(([id, label]) => ({ id, label })),
];

const ACTION_LABELS = {
  created: 'Added',
  updated: 'Edited',
  deleted: 'Deleted',
  bulk_created: 'Bulk added',
  enabled: 'Enabled',
  disabled: 'Disabled',
  login: 'Signed in',
};

function formatWhen(iso) {
  const d = new Date(iso);
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AuditTrail() {
  const router = useRouter();
  const { canViewAuditTrail } = usePermissions();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [moduleFilter, setModuleFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async (offset = 0, module = moduleFilter, append = false) => {
    const params = new URLSearchParams({ limit: '80', offset: String(offset) });
    if (module) params.set('module', module);
    const data = await apiFetch(`/api/audit-log?${params}`);
    setTotal(data.total);
    setItems((prev) => (append ? [...prev, ...data.items] : data.items));
    return data;
  }, [moduleFilter]);

  useEffect(() => {
    if (!canViewAuditTrail) {
      router.replace('/dashboard');
      return;
    }
    setLoading(true);
    load(0, moduleFilter, false).finally(() => setLoading(false));
  }, [canViewAuditTrail, moduleFilter, load, router]);

  const handleRefresh = async () => {
    setLoading(true);
    await load(0, moduleFilter, false);
    setLoading(false);
  };

  const handleLoadMore = async () => {
    setLoadingMore(true);
    await load(items.length, moduleFilter, true);
    setLoadingMore(false);
  };

  if (!canViewAuditTrail) return null;

  return (
    <div className="audit-trail-page">
      <header className="audit-trail-header">
        <div>
          <h1 className="page-title audit-trail-title">
            <ScrollText size={24} />
            Audit Trail
          </h1>
          <p className="page-subtitle">
            One-line activity log — sign-ins, adds, edits, and deletes. Click any row to open the record.
          </p>
        </div>
        <button type="button" className="btn-secondary" onClick={handleRefresh} disabled={loading}>
          <RefreshCw size={15} className={loading ? 'audit-spin' : ''} />
          Refresh
        </button>
      </header>

      <div className="audit-module-filters" role="tablist" aria-label="Filter by module">
        {MODULE_FILTERS.map((f) => (
          <button
            key={f.id || 'all'}
            type="button"
            role="tab"
            aria-selected={moduleFilter === f.id}
            className={`audit-module-chip ${moduleFilter === f.id ? 'active' : ''}`}
            onClick={() => setModuleFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <p className="audit-count">{total} event{total === 1 ? '' : 's'}</p>

      {loading ? (
        <p className="page-subtitle">Loading activity…</p>
      ) : items.length === 0 ? (
        <div className="audit-empty">
          <ScrollText size={36} strokeWidth={1.25} />
          <p>No activity recorded yet. Actions across the system will appear here.</p>
        </div>
      ) : (
        <ul className="audit-list">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="audit-row"
                onClick={() => router.push(item.href)}
                title="Open related record"
              >
                <span className="audit-row-time">{formatWhen(item.createdAt)}</span>
                <span className={`audit-action audit-action--${item.action}`}>
                  {ACTION_LABELS[item.action] || item.action}
                </span>
                <span className="audit-module-badge">{item.moduleLabel}</span>
                <span className="audit-summary">{item.summary}</span>
                <span className="audit-actor">
                  {item.userName || item.userEmail}
                  {item.userRoleLabel && (
                    <span className="audit-actor-role"> · {item.userRoleLabel}</span>
                  )}
                </span>
                <ChevronRight size={16} className="audit-row-arrow" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      {!loading && items.length < total && (
        <div className="audit-load-more">
          <button type="button" className="btn-secondary" onClick={handleLoadMore} disabled={loadingMore}>
            {loadingMore ? 'Loading…' : `Load more (${items.length} of ${total})`}
          </button>
        </div>
      )}
    </div>
  );
}
