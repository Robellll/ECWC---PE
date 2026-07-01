'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Plus, Search, X, ArrowUp, ArrowDown, ImagePlus } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { apiFetch } from '@/lib/api-client';
import { sortTableData, nextSortDirection } from '@/lib/table-sort';
import {
  ACCIDENT_TYPES,
  INSURANCE_DOC_FIELDS,
  readImageFileAsDataUrl,
  getDaysSinceAccident,
  getDaysSinceTier,
  formatDaysSinceLabel,
} from '@/lib/insurance';
import { isAccidentInRange, isRangeComplete, formatRangeLabel } from '@/lib/date-range';
import { INSURANCE_STAGES } from '@/lib/constants';
import GarageDateRangePicker from '@/components/garage/GarageDateRangePicker';
import InsuranceDetailDrawer from '@/components/insurance/InsuranceDetailDrawer';
import FilterSummaryCards from '@/components/shared/FilterSummaryCards';
import './Insurance.css';

const STAGE_CARD_LABELS = {
  'Reported/Notified': 'Reported',
  'Document Pending': 'Docs Pending',
  'Insurance Inspection': 'Inspection',
  Bid: 'Bid',
  'Under Maintenance': 'Maintenance',
  Completed: 'Completed',
};

const STAGE_CLASS_MAP = {
  'Reported/Notified': 'stage-reported',
  'Document Pending': 'stage-docs',
  'Insurance Inspection': 'stage-inspect',
  Bid: 'stage-bid',
  'Under Maintenance': 'stage-maintenance',
  Completed: 'stage-completed',
};

const TABLE_COLUMNS = [
  { key: 'vehicleType', label: 'Make & Model', type: 'text' },
  { key: 'plate', label: 'Plate No.', type: 'text' },
  { key: 'accidentType', label: 'Accident Type', type: 'text' },
  { key: 'daysSince', label: 'Duration', type: 'number' },
  { key: 'stage', label: 'Stage', type: 'text' },
];

function getSortValue(claim, column) {
  switch (column) {
    case 'vehicleType':
      return (claim.vehicleType || '').toLowerCase();
    case 'plate':
      return (claim.plate || '').toLowerCase();
    case 'accidentType':
      return (claim.accidentType || '').toLowerCase();
    case 'daysSince':
      return getDaysSinceAccident(claim.accidentDate, claim.completedDate);
    case 'stage':
      return (claim.stage || '').toLowerCase();
    default:
      return '';
  }
}

const SortableHeader = ({ column, label, sortColumn, sortDirection, onSort }) => {
  const isActive = sortColumn === column.key;
  return (
    <th scope="col" className={isActive ? 'th-sortable th-sorted' : 'th-sortable'}>
      <button
        type="button"
        className="th-sort-btn"
        onClick={() => onSort(column.key)}
        aria-sort={isActive ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
      >
        <span className="th-sort-label">{label}</span>
        <span className={`th-sort-icons ${isActive ? 'active' : ''}`} aria-hidden="true">
          {isActive ? (
            sortDirection === 'asc' ? <ArrowUp size={12} strokeWidth={2.5} /> : <ArrowDown size={12} strokeWidth={2.5} />
          ) : (
            <>
              <ArrowUp size={10} className="th-sort-icon-muted" strokeWidth={2} />
              <ArrowDown size={10} className="th-sort-icon-muted" strokeWidth={2} />
            </>
          )}
        </span>
      </button>
    </th>
  );
};

const DaysSinceCell = ({ accidentDate, completedDate }) => {
  const days = getDaysSinceAccident(accidentDate, completedDate);
  const tier = getDaysSinceTier(days);
  return (
    <span className={`days-since-badge days-since-${tier}`}>
      {formatDaysSinceLabel(days)}
    </span>
  );
};

const DocCheckRow = ({ values, onToggle }) => (
  <div className="ins-doc-check-row">
    {INSURANCE_DOC_FIELDS.map(({ key, label }) => (
      <label key={key} className={`ins-doc-chip ${values[key] ? 'checked' : ''}`}>
        <input
          type="checkbox"
          checked={Boolean(values[key])}
          onChange={() => onToggle(key)}
        />
        <span className="ins-doc-chip-label">{label}</span>
      </label>
    ))}
  </div>
);

const emptyForm = () => ({
  vehicleType: '',
  plate: '',
  projectName: '',
  driverOperator: '',
  accidentDate: new Date().toISOString().slice(0, 10),
  policeReport: false,
  accidentForm: false,
  licenseDoc: false,
  accidentType: 'collision',
  accidentTypeOther: '',
  accidentDescription: '',
  accidentPhoto: null,
  photoPreview: null,
});

const MAINTENANCE_STAGE = 'Under Maintenance';

const Insurance = () => {
  const { isInsuranceEditor } = usePermissions();
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState(null);
  const [repairLocationFilter, setRepairLocationFilter] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [newClaim, setNewClaim] = useState(emptyForm);
  const [submitError, setSubmitError] = useState('');
  const [sortColumn, setSortColumn] = useState('daysSince');
  const [sortDirection, setSortDirection] = useState('asc');
  const [sortAnimating, setSortAnimating] = useState(false);
  const [dateRange, setDateRange] = useState(null);

  const loadClaims = useCallback(async () => {
    const data = await apiFetch('/api/insurance-claims');
    setClaims(data);
    setLoading(false);
  }, []);

  useEffect(() => { loadClaims(); }, [loadClaims]);

  const drawerClaim = claims.find((c) => c.id === selectedClaim?.id) || selectedClaim;

  const rangeActive = isRangeComplete(dateRange);

  const rangeFilteredClaims = useMemo(() => {
    if (!rangeActive) return claims;
    return claims.filter((c) => isAccidentInRange(c, dateRange));
  }, [claims, dateRange, rangeActive]);

  const baseClaims = rangeActive ? rangeFilteredClaims : claims;
  const totalClaims = baseClaims.length;

  const stageCounts = useMemo(() => {
    const counts = Object.fromEntries(INSURANCE_STAGES.map((s) => [s, 0]));
    baseClaims.forEach((c) => {
      if (counts[c.stage] !== undefined) counts[c.stage] += 1;
    });
    return counts;
  }, [baseClaims]);

  const maintenanceClaims = useMemo(
    () => baseClaims.filter((c) => c.stage === MAINTENANCE_STAGE),
    [baseClaims],
  );

  const maintenanceLocationCounts = useMemo(() => ({
    central: maintenanceClaims.filter((c) => c.repairLocation === 'central').length,
    outsource: maintenanceClaims.filter((c) => c.repairLocation === 'outsource').length,
  }), [maintenanceClaims]);

  const summaryCards = useMemo(() => {
    const totalLabel = rangeActive ? 'Accidents in Period' : 'Total Incidents';
    const stageCards = INSURANCE_STAGES.map((stage) => {
      const card = {
        id: stage,
        label: STAGE_CARD_LABELS[stage] || stage,
        value: stageCounts[stage] ?? 0,
        stageClass: STAGE_CLASS_MAP[stage] || 'stage-reported',
        valueClass: stage === 'Completed' ? 'success' : stage === 'Document Pending' ? 'warning' : '',
      };
      if (stage === MAINTENANCE_STAGE) {
        card.subFilters = [
          { id: 'central', label: 'Central', value: maintenanceLocationCounts.central },
          { id: 'outsource', label: 'Outsource', value: maintenanceLocationCounts.outsource },
        ];
        card.subFiltersLayout = 'compact';
      }
      return card;
    });
    return [
      { id: 'total', label: totalLabel, value: totalClaims, isTotal: true },
      ...stageCards,
    ];
  }, [rangeActive, totalClaims, stageCounts, maintenanceLocationCounts]);

  const handleTotalReset = useCallback(() => {
    setStageFilter(null);
    setRepairLocationFilter(null);
  }, []);

  const handleStageSelect = useCallback((id) => {
    if (id === stageFilter) {
      setStageFilter(null);
      setRepairLocationFilter(null);
    } else {
      setStageFilter(id);
      if (id !== MAINTENANCE_STAGE) setRepairLocationFilter(null);
    }
  }, [stageFilter]);

  const handleRepairSubSelect = useCallback((_stageId, subId) => {
    setStageFilter(MAINTENANCE_STAGE);
    setRepairLocationFilter((prev) => (prev === subId ? null : subId));
  }, []);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Delete this insurance claim record?')) return;
    await apiFetch(`/api/insurance-claims/${id}`, { method: 'DELETE' });
    if (selectedClaim?.id === id) setSelectedClaim(null);
    await loadClaims();
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readImageFileAsDataUrl(file);
      setNewClaim((prev) => ({ ...prev, accidentPhoto: dataUrl, photoPreview: dataUrl }));
      setSubmitError('');
    } catch (err) {
      setSubmitError(err.message);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    try {
      const payload = {
        vehicleType: newClaim.vehicleType,
        plate: newClaim.plate,
        projectName: newClaim.projectName,
        driverOperator: newClaim.driverOperator,
        accidentDate: newClaim.accidentDate,
        policeReport: newClaim.policeReport,
        accidentForm: newClaim.accidentForm,
        licenseDoc: newClaim.licenseDoc,
        accidentType: newClaim.accidentType,
        accidentTypeOther: newClaim.accidentTypeOther,
        accidentDescription: newClaim.accidentDescription,
        accidentPhoto: newClaim.accidentPhoto,
      };
      const created = await apiFetch('/api/insurance-claims', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setShowAddModal(false);
      setNewClaim(emptyForm());
      await loadClaims();
      setSelectedClaim(created);
    } catch (err) {
      setSubmitError(err.message || 'Could not register claim');
    }
  };

  const handleClaimUpdate = (updated) => {
    setClaims((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setSelectedClaim(updated);
  };

  const handleSort = useCallback((columnKey) => {
    setSortDirection((prev) => nextSortDirection(sortColumn, columnKey, prev));
    setSortColumn(columnKey);
    setSortAnimating(true);
  }, [sortColumn]);

  useEffect(() => {
    if (!sortAnimating) return undefined;
    const timer = setTimeout(() => setSortAnimating(false), 220);
    return () => clearTimeout(timer);
  }, [sortAnimating, sortColumn, sortDirection]);

  const columnTypeMap = useMemo(
    () => Object.fromEntries(TABLE_COLUMNS.map((c) => [c.key, c.type])),
    [],
  );

  const filteredClaims = useMemo(() => {
    const filtered = claims.filter((c) => {
      const q = search.toLowerCase();
      const matchSearch =
        (c.plate || '').toLowerCase().includes(q) ||
        (c.vehicleType || '').toLowerCase().includes(q) ||
        (c.driverOperator || '').toLowerCase().includes(q) ||
        (c.projectName || '').toLowerCase().includes(q) ||
        (c.accidentDescription || '').toLowerCase().includes(q);
      const matchStage = !stageFilter || c.stage === stageFilter;
      const matchRepair = !repairLocationFilter
        || (c.stage === MAINTENANCE_STAGE && c.repairLocation === repairLocationFilter);
      const matchRange = !rangeActive || isAccidentInRange(c, dateRange);
      return matchSearch && matchStage && matchRepair && matchRange;
    });

    return sortTableData(filtered, {
      column: sortColumn,
      direction: sortDirection,
      type: columnTypeMap[sortColumn],
      getValue: getSortValue,
    });
  }, [claims, search, stageFilter, repairLocationFilter, dateRange, rangeActive, sortColumn, sortDirection, columnTypeMap]);

  const stageClass = (s) => STAGE_CLASS_MAP[s] || 'stage-reported';

  if (loading) {
    return <div className="garage-container insurance-container"><p className="page-subtitle">Loading insurance claims…</p></div>;
  }

  return (
    <div className="garage-container insurance-container">
      <div className="garage-header">
        <div>
          <h1 className="dashboard-title">Insurance Claims</h1>
          <span className="page-subtitle">Accident reporting, documentation, and claim workflow</span>
        </div>
        {isInsuranceEditor && (
          <button className="register-btn" onClick={() => { setShowAddModal(true); setSubmitError(''); }}>
            <Plus size={16} />
            Report Accident
          </button>
        )}
      </div>

      <div className="insurance-report-toolbar">
        <span className="insurance-report-label">Claims Report</span>
        <GarageDateRangePicker
          value={dateRange}
          onChange={setDateRange}
          popoverTitle="Select accident date range"
          popoverHint="Shows all claims where the accident occurred between the selected dates (any stage)"
        />
      </div>

      {rangeActive && (
        <p className="date-range-hint">
          Showing accidents that occurred {formatRangeLabel(dateRange)}
          {stageFilter && ` · ${STAGE_CARD_LABELS[stageFilter] || stageFilter}${repairLocationFilter ? ` · ${repairLocationFilter === 'central' ? 'Central' : 'Outsource'}` : ''}`}
        </p>
      )}

      <FilterSummaryCards
        cards={summaryCards}
        selectedId={stageFilter}
        onSelect={handleStageSelect}
        selectedSubId={repairLocationFilter}
        onSubSelect={handleRepairSubSelect}
        onTotalReset={handleTotalReset}
        className="filter-summary-row--stages"
      />

      <div className="table-controls">
        <div className="search-bar">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search plate, vehicle type, driver, project…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="table-wrapper">
        <table className="garage-table garage-table-sortable insurance-table">
          <thead>
            <tr>
              {TABLE_COLUMNS.map((col) => (
                <SortableHeader
                  key={col.key}
                  column={col}
                  label={col.label}
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
              ))}
            </tr>
          </thead>
          <tbody className={sortAnimating ? 'tbody-sorting' : ''}>
            {filteredClaims.length === 0 ? (
              <tr>
                <td colSpan="5" className="empty-table-cell">
                  {rangeActive
                    ? `No accidents occurred ${formatRangeLabel(dateRange)}${stageFilter ? ` at ${STAGE_CARD_LABELS[stageFilter] || stageFilter}` : ''}.`
                    : `No insurance claims found${stageFilter ? ` at ${STAGE_CARD_LABELS[stageFilter] || stageFilter}` : ''}. ${isInsuranceEditor && !stageFilter ? 'Report an accident to get started.' : ''}`}
                </td>
              </tr>
            ) : (
              filteredClaims.map((claim) => (
                <tr
                  key={claim.id}
                  onClick={() => setSelectedClaim(claim)}
                  className={`clickable-row ${claim.status === 'Completed' ? 'row-completed' : ''} ${selectedClaim?.id === claim.id ? 'row-selected' : ''}`}
                >
                  <td>{claim.vehicleType}</td>
                  <td className="plate-cell">{claim.plate}</td>
                  <td>
                    {claim.accidentType}
                    {claim.accidentType === 'Other' && claim.accidentTypeOther ? (
                      <span className="text-muted"> — {claim.accidentTypeOther}</span>
                    ) : null}
                  </td>
                  <td>
                    <DaysSinceCell accidentDate={claim.accidentDate} completedDate={claim.completedDate} />
                  </td>
                  <td>
                    <span className={`stage-pill ${stageClass(claim.stage)}`}>{claim.stage}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {drawerClaim && (
        <InsuranceDetailDrawer
          claim={drawerClaim}
          onClose={() => setSelectedClaim(null)}
          onUpdate={handleClaimUpdate}
          onDelete={isInsuranceEditor ? () => handleDelete({ stopPropagation: () => {} }, drawerClaim.id) : null}
        />
      )}

      {showAddModal && (
        <div className="modal-backdrop">
          <div className="modal-content insurance-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Report Accident</h3>
              <button type="button" className="close-btn" onClick={() => setShowAddModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="vehicleType">Vehicle Make &amp; Model *</label>
                  <input
                    id="vehicleType"
                    type="text"
                    required
                    placeholder="e.g. CAT 320 Excavator, Toyota Hilux"
                    value={newClaim.vehicleType}
                    onChange={(e) => setNewClaim({ ...newClaim, vehicleType: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="plate">Plate No. *</label>
                  <input
                    id="plate"
                    type="text"
                    required
                    placeholder="e.g. AA-34567"
                    value={newClaim.plate}
                    onChange={(e) => setNewClaim({ ...newClaim, plate: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="project">Project *</label>
                  <input
                    id="project"
                    type="text"
                    required
                    placeholder="e.g. Addis Ababa Ring Road"
                    value={newClaim.projectName}
                    onChange={(e) => setNewClaim({ ...newClaim, projectName: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="driver">Driver / Operator Name *</label>
                  <input
                    id="driver"
                    type="text"
                    required
                    placeholder="Full name"
                    value={newClaim.driverOperator}
                    onChange={(e) => setNewClaim({ ...newClaim, driverOperator: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="accidentDate">Date of Accident *</label>
                  <input
                    id="accidentDate"
                    type="date"
                    required
                    value={newClaim.accidentDate}
                    onChange={(e) => setNewClaim({ ...newClaim, accidentDate: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="accidentType">Accident Type *</label>
                  <select
                    id="accidentType"
                    required
                    value={newClaim.accidentType}
                    onChange={(e) => setNewClaim({ ...newClaim, accidentType: e.target.value })}
                  >
                    {ACCIDENT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {newClaim.accidentType === 'other' && (
                <div className="form-group">
                  <label htmlFor="accidentTypeOther">Specify Accident Type *</label>
                  <input
                    id="accidentTypeOther"
                    type="text"
                    required
                    placeholder="Describe accident type"
                    value={newClaim.accidentTypeOther}
                    onChange={(e) => setNewClaim({ ...newClaim, accidentTypeOther: e.target.value })}
                  />
                </div>
              )}

              <div className="form-group">
                <span className="form-label-block">Documents on File</span>
                <DocCheckRow
                  values={newClaim}
                  onToggle={(key) => setNewClaim({ ...newClaim, [key]: !newClaim[key] })}
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Accident Description *</label>
                <textarea
                  id="description"
                  required
                  placeholder="Describe what happened, location, damage, witnesses…"
                  rows={4}
                  value={newClaim.accidentDescription}
                  onChange={(e) => setNewClaim({ ...newClaim, accidentDescription: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label htmlFor="accidentPhoto">Accident Photo</label>
                <div className="photo-upload-zone">
                  <input
                    id="accidentPhoto"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePhotoChange}
                    className="photo-input-hidden"
                  />
                  <label htmlFor="accidentPhoto" className="photo-upload-btn">
                    <ImagePlus size={18} />
                    {newClaim.photoPreview ? 'Change photo' : 'Add photo (optional, max 2 MB)'}
                  </label>
                  {newClaim.photoPreview && (
                    <img src={newClaim.photoPreview} alt="Accident preview" className="photo-preview-thumb" />
                  )}
                </div>
              </div>

              {submitError && <p className="form-error">{submitError}</p>}

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  Register Accident
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Insurance;
