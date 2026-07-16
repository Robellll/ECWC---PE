'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Plus, Trash2, ChevronRight, Table, Key, LayoutGrid,
} from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { apiFetch } from '@/lib/api-client';
import EquipmentDetailDrawer from '@/components/equipment/EquipmentDetailDrawer';
import EquipmentRegisterModal from '@/components/equipment/EquipmentRegisterModal';
import EquipmentBulkRegisterModal from '@/components/equipment/EquipmentBulkRegisterModal';
import ProjectSiteLoginModal from '@/components/garage/ProjectSiteLoginModal';
import SearchBar from '@/components/shared/SearchBar';
import AppLoader from '@/components/ui/AppLoader';
import './Equipment.css';
import './ProjectEquipment.css';
import './ProjectGarage.css';
import './Garage.css';

function liveGroup(eq) {
  return eq.liveStatus || 'operable';
}

function statusBadgeClass(group) {
  if (group === 'operable') return 'status-operational';
  if (group === 'idle') return 'status-idle';
  return 'status-breakdown';
}

function liveLabel(eq) {
  if (eq.liveStatus === 'operable') return 'Operable';
  if (eq.liveStatus === 'idle') return 'Idle';
  return 'Down';
}

export default function ProjectEquipmentDetail({ projectId }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const itemParam = searchParams.get('item');
  const statusParam = searchParams.get('status');
  const { canDeleteEquipment, canEditAnyProjectEquipment, isProjPEAdmin, isSuperAdmin, user } = usePermissions();

  const [project, setProject] = useState(null);
  const [equipments, setEquipments] = useState([]);
  const [stats, setStats] = useState({ total: 0, operable: 0, idle: 0, down: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(statusParam || null);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showSiteLogin, setShowSiteLogin] = useState(false);

  const load = useCallback(async () => {
    const data = await apiFetch(`/api/project-equipment/${projectId}`);
    setProject(data.project);
    setEquipments(data.equipment);
    setStats(data.stats);
    setLoading(false);
    return data;
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const canEdit = canEditAnyProjectEquipment || (isProjPEAdmin && user?.projectId === projectId);

  useEffect(() => {
    if (!itemParam || equipments.length === 0) return;
    const found = equipments.find((e) => e.id === itemParam);
    if (found) setSelectedEquipment(found);
  }, [itemParam, equipments]);

  useEffect(() => {
    if (statusParam) setStatusFilter(statusParam);
  }, [statusParam]);

  const filteredEquipments = useMemo(() => {
    const q = search.trim().toLowerCase();
    return equipments.filter((eq) => {
      const haystack = [eq.code, eq.name, eq.plateSerial, eq.operatorName, eq.operatorPhone];
      const matchesSearch = !q || haystack.some((v) => String(v ?? '').toLowerCase().includes(q));
      const matchesStatus = !statusFilter || liveGroup(eq) === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [equipments, search, statusFilter]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this equipment record?')) return;
    await apiFetch(`/api/equipment/${id}`, { method: 'DELETE' });
    if (selectedEquipment?.id === id) setSelectedEquipment(null);
    await load();
  };

  const handleRegister = async (form) => {
    const assetNo = form.assetNo.trim();
    if (equipments.some((eq) => eq.code.toUpperCase() === assetNo.toUpperCase())) {
      throw new Error(`Asset No. "${assetNo}" already exists.`);
    }
    await apiFetch(`/api/project-equipment/${projectId}`, {
      method: 'POST',
      body: JSON.stringify({
        assetNo,
        plateSerial: form.plateSerial.trim(),
        model: form.model.trim(),
        status: form.status,
        statusReason: form.statusReason.trim(),
        operatorName: form.operatorName.trim(),
        operatorPhone: form.operatorPhone.trim(),
        capacity: form.capacity.trim(),
        remarks: form.remarks.trim(),
        photo: form.photo || '',
      }),
    });
    await load();
  };

  const handleBulkRegister = async (items) => {
    const result = await apiFetch(`/api/project-equipment/${projectId}/bulk`, {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
    if (!result?.created) {
      throw new Error('No equipment was registered.');
    }
    await load();
  };

  const existingAssetNos = useMemo(
    () => equipments.map((eq) => eq.code),
    [equipments],
  );

  if (loading) {
    return <AppLoader label="Loading project equipment…" variant="page" className="equipment-container" />;
  }

  if (!project) {
    return (
      <div className="equipment-container">
        <p className="production-empty">Project not found or access denied.</p>
        <button type="button" className="btn-secondary" onClick={() => router.push('/equipment')}>Back to Equipment</button>
      </div>
    );
  }

  return (
    <div className="equipment-container">
      <div className="project-garage-detail-toolbar">
        <div className="pg-toolbar-left">
          <button type="button" className="project-garage-home-btn" onClick={() => router.push('/equipment')}>
            <LayoutGrid size={17} />
            <span>All Projects</span>
          </button>
        </div>

        <div className="pg-toolbar-center">
          <h1 className="page-title pg-toolbar-title">{project.name}</h1>
          <p className="page-subtitle pg-toolbar-subtitle">Click any row to view full details, photo, and remarks</p>
        </div>

        <div className="pg-toolbar-right pe-header-actions project-garage-detail-actions">
          {isSuperAdmin && (
            <button type="button" className="btn-secondary" onClick={() => setShowSiteLogin(true)}>
              <Key size={16} /> Site Login
            </button>
          )}
          {canEdit && (
            <>
              <button type="button" className="btn-secondary" onClick={() => setShowBulkModal(true)}>
                <Table size={16} /> Bulk Register
              </button>
              <button type="button" className="btn-primary" onClick={() => setShowAddModal(true)}>
                <Plus size={16} /> Register Equipment
              </button>
            </>
          )}
        </div>
      </div>

      <div className="pe-fleet-layout pe-fleet-layout--detail">
        <button
          type="button"
          className={`pe-fleet-card pe-fleet-card--total pe-fleet-card--clickable ${!statusFilter ? 'pe-fleet-card--active' : ''}`}
          onClick={() => setStatusFilter(null)}
        >
          <span className="pe-fleet-label">Total</span>
          <span className="pe-fleet-value">{stats.total}</span>
        </button>

        <div className="pe-status-row" role="group" aria-label="Equipment status">
          {[
            { id: 'operable', label: 'Operable', value: stats.operable, className: 'success' },
            { id: 'idle', label: 'Idle', value: stats.idle, className: 'warning' },
            { id: 'down', label: 'Down', value: stats.down, className: 'danger' },
          ].map((card) => (
            <button
              key={card.id}
              type="button"
              className={`pe-fleet-card pe-fleet-card--status pe-fleet-card--clickable ${statusFilter === card.id ? 'pe-fleet-card--active' : ''}`}
              onClick={() => setStatusFilter(statusFilter === card.id ? null : card.id)}
            >
              <span className="pe-fleet-label">{card.label}</span>
              <span className={`pe-fleet-value ${card.className}`}>{card.value}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="equipment-filters">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search asset no., plate, model, or operator…"
        />
      </div>

      <div className="table-wrapper">
        <table className="equipment-table">
          <thead>
            <tr>
              <th>Asset No.</th>
              <th>Plate / Serial</th>
              <th>Model</th>
              <th>Status</th>
              <th>Operator</th>
              <th>Updated</th>
              <th aria-label="Open" />
            </tr>
          </thead>
          <tbody>
            {filteredEquipments.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center empty-row">
                  No equipment found. {canEdit && 'Click "Register Equipment" to add machinery.'}
                </td>
              </tr>
            ) : filteredEquipments.map((eq) => (
              <tr
                key={eq.id}
                className={`row-clickable ${selectedEquipment?.id === eq.id ? 'row-selected' : ''}`}
                onClick={() => setSelectedEquipment(eq)}
                title="Click to view details"
              >
                <td className="font-semibold eq-code-cell">{eq.code}</td>
                <td>{eq.plateSerial || '—'}</td>
                <td className="font-semibold">{eq.name}</td>
                <td>
                  <span className={`status-badge-indicator ${statusBadgeClass(liveGroup(eq))}`}>
                    {liveLabel(eq)}
                  </span>
                </td>
                <td className="text-muted">
                  {eq.operatorName
                    ? <>{eq.operatorName}{eq.operatorPhone && <span className="pe-operator-phone"> · {eq.operatorPhone}</span>}</>
                    : '—'}
                </td>
                <td className="text-muted">
                  {eq.statusUpdatedAt
                    ? new Date(eq.statusUpdatedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                    : '—'}
                </td>
                <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
                  {canDeleteEquipment && (
                    <button type="button" className="delete-row-btn" onClick={() => handleDelete(eq.id)} title="Delete">
                      <Trash2 size={15} />
                    </button>
                  )}
                  <ChevronRight size={15} className="row-arrow" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <EquipmentRegisterModal
        open={showAddModal}
        projectName={project.name}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleRegister}
      />

      <EquipmentBulkRegisterModal
        open={showBulkModal}
        projectName={project.name}
        existingAssetNos={existingAssetNos}
        onClose={() => setShowBulkModal(false)}
        onSubmit={handleBulkRegister}
      />

      {showSiteLogin && (
        <ProjectSiteLoginModal
          module="equipment"
          project={project}
          onClose={() => setShowSiteLogin(false)}
        />
      )}

      {selectedEquipment && (
        <EquipmentDetailDrawer
          equipment={equipments.find((e) => e.id === selectedEquipment.id) || selectedEquipment}
          canEdit={canEdit}
          onClose={() => setSelectedEquipment(null)}
          onUpdate={(updated) => {
            setEquipments((prev) => prev.map((eq) => (eq.id === updated.id ? updated : eq)));
            setSelectedEquipment(updated);
            load();
          }}
        />
      )}
    </div>
  );
}
