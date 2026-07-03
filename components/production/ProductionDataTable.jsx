'use client';

import { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Pencil, Trash2, X } from 'lucide-react';
import SearchBar from '@/components/shared/SearchBar';
import './ProductionModal.css';

export function ProdBadge({ status, label }) {
  const cls = (status || '').replace(/ /g, '_').toLowerCase();
  return <span className={`prod-badge ${cls}`}>{label || status}</span>;
}

export function ProdProgress({ value }) {
  return (
    <div className="prod-progress" title={`${value}%`}>
      <div className="prod-progress-fill" style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
}

export function SimpleBarChart({ items, valueKey = 'total', labelKey = 'name' }) {
  const max = Math.max(...items.map((i) => Number(i[valueKey]) || 0), 1);
  return (
    <div>
      {items.map((item) => (
        <div key={item[labelKey]} className="production-bar-row">
          <span>{item[labelKey]}</span>
          <span>{Number(item[valueKey]).toLocaleString()}</span>
          <div className="production-bar-track">
            <div
              className="production-bar-fill"
              style={{ width: `${(Number(item[valueKey]) / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
      {items.length === 0 && <p className="production-empty">No data yet.</p>}
    </div>
  );
}

export default function ProductionDataTable({
  columns,
  rows,
  searchKeys = [],
  onEdit,
  onDelete,
  canEdit = false,
  emptyMessage = 'No records found.',
}) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = rows;
    if (q && searchKeys.length) {
      list = list.filter((row) => searchKeys.some((k) => String(row[k] ?? '').toLowerCase().includes(q)));
    }
    if (sortKey) {
      list = [...list].sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        if (av < bv) return sortDir === 'asc' ? -1 : 1;
        if (av > bv) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return list;
  }, [rows, search, searchKeys, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  return (
    <>
      <div className="production-search-wrap">
        <SearchBar variant="modern" value={search} onChange={setSearch} placeholder="Search records…" />
      </div>
      <div className="production-table-wrap">
        <table className="production-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key}>
                  {col.sortable ? (
                    <button type="button" className="th-sort-btn" onClick={() => toggleSort(col.key)}>
                      {col.label}
                    </button>
                  ) : col.label}
                </th>
              ))}
              {canEdit && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={columns.length + (canEdit ? 1 : 0)} className="production-empty">{emptyMessage}</td></tr>
            ) : filtered.map((row) => (
              <tr key={row.id}>
                {columns.map((col) => (
                  <td key={col.key}>{col.render ? col.render(row) : row[col.key]}</td>
                ))}
                {canEdit && (
                  <td>
                    <button type="button" className="view-btn" onClick={() => onEdit?.(row)} title="Edit"><Pencil size={15} /></button>
                    <button type="button" className="delete-row-btn" onClick={() => onDelete?.(row)} title="Delete"><Trash2 size={15} /></button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function ProductionModal({
  open,
  title,
  onClose,
  onSubmit,
  children,
  submitLabel = 'Save',
  large = false,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="production-modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className={`production-modal-content ${large ? 'production-modal-lg' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="production-modal-title"
      >
        <div className="production-modal-header">
          <h2 id="production-modal-title">{title}</h2>
          <button
            type="button"
            className="production-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <form className="production-modal-form" onSubmit={onSubmit}>
          <div className="production-modal-body">
            {children}
          </div>
          <div className="production-modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">{submitLabel}</button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

export function FormField({ label, children, full }) {
  return (
    <div className={`production-form-group ${full ? 'form-group-full' : ''}`}>
      {label && <label>{label}</label>}
      {children}
    </div>
  );
}

export function exportCsv(filename, rows, headers) {
  const keys = Object.keys(headers);
  const lines = [
    keys.map((k) => headers[k]).join(','),
    ...rows.map((r) => keys.map((k) => `"${String(r[k] ?? '').replace(/"/g, '""')}"`).join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function printReport(title, rows, headers) {
  const keys = Object.keys(headers);
  const html = `<html><head><title>${title}</title>
    <style>body{font-family:Inter,sans-serif;padding:24px}table{width:100%;border-collapse:collapse}
    th,td{border:1px solid #ddd;padding:8px;font-size:12px}th{background:#f3f4f6}</style></head>
    <body><h1>${title}</h1><table><thead><tr>${keys.map((k) => `<th>${headers[k]}</th>`).join('')}</tr></thead>
    <tbody>${rows.map((r) => `<tr>${keys.map((k) => `<td>${r[k] ?? ''}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`;
  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
  w.print();
}
