'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Building2, User, ChevronRight, Truck, Key } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { apiFetch } from '@/lib/api-client';
import { LIVE_STATUS_LABELS } from '@/lib/equipment';
import SearchBar from '@/components/shared/SearchBar';
import ProjectSiteLoginModal from '@/components/garage/ProjectSiteLoginModal';
import CargoTruckIcon from '@/components/icons/CargoTruckIcon';
import './ProjectEquipment.css';
import './Garage.css';
import './ProjectGarage.css';

const FLEET_CARDS = [
  { key: 'total', label: 'Total Equipment', href: '/equipment', field: 'total', className: '' },
  { key: 'operable', label: 'Operable', href: '/equipment?fleet=operable', field: 'operable', className: 'success' },
  { key: 'idle', label: 'Idle', href: '/equipment?fleet=idle', field: 'idle', className: 'warning' },
  { key: 'down', label: 'Down', href: '/equipment?fleet=down', field: 'down', className: 'danger' },
];

function liveStatusLabel(eq) {
  if (eq.liveStatus === 'operable') return 'Operable';
  if (eq.liveStatus === 'idle') return 'Idle';
  return 'Down';
}

function statusClass(eq) {
  if (eq.liveStatus === 'operable') return 'pe-status-operable';
  if (eq.liveStatus === 'idle') return 'pe-status-idle';
  return 'pe-status-down';
}

export default function ProjectEquipment() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fleetFilter = searchParams.get('fleet');
  const { isProjPEAdmin, canViewAllProjectEquipment, user, isSuperAdmin } = usePermissions();
  const [fleet, setFleet] = useState({ total: 0, operable: 0, idle: 0, down: 0 });
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loginProject, setLoginProject] = useState(null);

  const load = useCallback(async () => {
    const data = await apiFetch('/api/project-equipment');
    setFleet(data.fleet);
    setProjects(data.projects);
    setLoading(false);
    return data;
  }, []);

  useEffect(() => {
    load().then((data) => {
      if (isProjPEAdmin && !canViewAllProjectEquipment && data.projects.length === 1) {
        router.replace(`/equipment/${data.projects[0].id}`);
      } else if (isProjPEAdmin && !canViewAllProjectEquipment && user?.projectId) {
        router.replace(`/equipment/${user.projectId}`);
      }
    });
  }, [load, isProjPEAdmin, canViewAllProjectEquipment, user?.projectId, router]);

  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) {
      setSearchResults([]);
      return undefined;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await apiFetch(`/api/project-equipment/search?q=${encodeURIComponent(q)}`);
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 280);
    return () => clearTimeout(timer);
  }, [search]);

  const filteredProjects = useMemo(() => {
    let list = projects;
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q));
    if (fleetFilter === 'operable') list = list.filter((p) => p.equipmentOperable > 0);
    if (fleetFilter === 'idle') list = list.filter((p) => p.equipmentIdle > 0);
    if (fleetFilter === 'down') list = list.filter((p) => p.equipmentDown > 0);
    return list;
  }, [projects, search, fleetFilter]);

  const searchQuery = search.trim();
  const showEquipmentResults = searchQuery.length >= 2;
  const showSectionLabels = showEquipmentResults && filteredProjects.length > 0;

  const equipmentResultsTitle = () => {
    if (searching) return 'Searching equipment…';
    const count = `${searchResults.length} match${searchResults.length === 1 ? '' : 'es'}`;
    return showSectionLabels ? `Equipment · ${count}` : `${searchResults.length} equipment result${searchResults.length === 1 ? '' : 's'}`;
  };

  if (loading) {
    return (
      <div className="project-equipment-container">
        <p className="page-subtitle">Loading equipment…</p>
      </div>
    );
  }

  return (
    <div className="project-equipment-container">
      <div className="project-equipment-header">
        <div>
          <h1 className="page-title">Equipment</h1>
          <p className="page-subtitle">Project machinery registers — fleet overview and per-project equipment</p>
        </div>
      </div>

      <div className="pe-fleet-layout">
        <Link
          href={fleetFilter ? '/equipment' : '/equipment'}
          className={`pe-fleet-card pe-fleet-card--total pe-fleet-card--clickable ${!fleetFilter ? 'pe-fleet-card--active' : ''}`}
        >
          <span className="pe-fleet-label">Total Equipment</span>
          <span className="pe-fleet-value">{fleet.total}</span>
        </Link>

        <div className="pe-status-row" role="group" aria-label="Fleet status">
          {FLEET_CARDS.filter((c) => c.key !== 'total').map((card) => {
            const active = fleetFilter === card.key;
            return (
              <Link
                key={card.key}
                href={card.href}
                className={`pe-fleet-card pe-fleet-card--status pe-fleet-card--clickable ${active ? 'pe-fleet-card--active' : ''}`}
              >
                <span className="pe-fleet-label">{card.label}</span>
                <span className={`pe-fleet-value ${card.className}`}>{fleet[card.field]}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {fleetFilter && (
        <p className="pe-filter-hint">
          Showing projects with <strong>{LIVE_STATUS_LABELS[fleetFilter] || fleetFilter}</strong> equipment.
          {' '}
          <Link href="/equipment" className="pe-filter-clear">Show all projects</Link>
        </p>
      )}

      <div className="pe-unified-search-wrap">
        <SearchBar
          className="pg-search-bar pe-unified-search-bar"
          iconClassName="pg-search-icon"
          value={search}
          onChange={setSearch}
          placeholder="Search equipment or projects…"
          ariaLabel="Search equipment or projects"
        />
      </div>

      {showEquipmentResults && (
        <div className="pe-search-results">
          <h3 className="pe-search-results-title">{equipmentResultsTitle()}</h3>
          {searchResults.length === 0 && !searching ? (
            <p className="pe-search-empty">No equipment matches &ldquo;{searchQuery}&rdquo;.</p>
          ) : (
            <ul className="pe-search-list">
              {searchResults.map((eq) => (
                <li key={eq.id}>
                  <button
                    type="button"
                    className="pe-search-item"
                    onClick={() => router.push(`/equipment/${eq.projectId}?item=${eq.id}`)}
                  >
                    <span className="pe-search-code">{eq.code}</span>
                    <span className="pe-search-name">{eq.name}</span>
                    <span className="pe-search-project">{eq.project}</span>
                    <span className={`pe-search-status ${statusClass(eq)}`}>{liveStatusLabel(eq)}</span>
                    <ChevronRight size={15} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {projects.length === 0 ? (
        <div className="project-garage-empty">
          <CargoTruckIcon size={40} strokeWidth={1.5} />
          <p>No projects available. Add projects in Contact Log first.</p>
        </div>
      ) : (
        <>
          {showSectionLabels && (
            <h3 className="pe-section-heading">Projects</h3>
          )}

          {filteredProjects.length === 0 ? (
            <div className="project-garage-empty pg-search-empty">
              <p>
                {searchQuery
                  ? `No projects match "${searchQuery}".`
                  : 'No projects match your filters.'}
              </p>
            </div>
          ) : (
            <div className="project-garage-grid">
              {filteredProjects.map((project) => (
                <article key={project.id} className="project-garage-card pe-project-card">
                  <button
                    type="button"
                    className="pg-card-main"
                    onClick={() => router.push(`/equipment/${project.id}`)}
                  >
                    <div className="pg-card-accent" aria-hidden="true" />
                    <header className="pg-card-header">
                      <div className="pg-card-title-row">
                        <span className="pg-card-badge"><Building2 size={16} /></span>
                        <h2 className="pg-card-title">{project.name}</h2>
                      </div>
                      <span className="pg-open-link">Open <ChevronRight size={15} /></span>
                    </header>
                    <div className="pg-metrics pe-card-metrics">
                      <div className="pg-metric pe-metric--operable">
                        <span className="pg-metric-value">{project.equipmentOperable}</span>
                        <span className="pg-metric-label">Operable</span>
                      </div>
                      <div className="pg-metric pe-metric--idle">
                        <span className="pg-metric-value">{project.equipmentIdle}</span>
                        <span className="pg-metric-label">Idle</span>
                      </div>
                      <div className="pg-metric pe-metric--down">
                        <span className="pg-metric-value">{project.equipmentDown}</span>
                        <span className="pg-metric-label">Down</span>
                      </div>
                    </div>
                    {(project.adminContact || project.maintenanceContact) && (
                      <div className="pg-card-contacts">
                        {project.adminContact && (
                          <span className="pg-contact">
                            <User size={12} />
                            <span><strong>Admin</strong> {project.adminContact.name}</span>
                          </span>
                        )}
                        {project.maintenanceContact && (
                          <span className="pg-contact">
                            <User size={12} />
                            <span><strong>Maint.</strong> {project.maintenanceContact.name}</span>
                          </span>
                        )}
                      </div>
                    )}
                    <footer className="pg-card-footer">
                      <span className="pg-total-jobs">
                        <Truck size={13} style={{ verticalAlign: 'middle' }} />
                        {' '}
                        {project.equipmentTotal} equipment unit{project.equipmentTotal === 1 ? '' : 's'}
                      </span>
                    </footer>
                  </button>

                  {isSuperAdmin && (
                    <div className="pg-card-actions">
                      <span className={`pg-site-login-chip ${project.equipmentEnabled ? '' : 'inactive'}`}>
                        <Key size={11} />
                        {project.equipmentEnabled ? (project.equipmentSiteEmail || 'Login active') : 'No site login'}
                      </span>
                      <button
                        type="button"
                        className="pg-site-login-btn"
                        onClick={() => setLoginProject(project)}
                      >
                        <Key size={13} /> Manage Login
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {loginProject && (
        <ProjectSiteLoginModal
          module="equipment"
          project={loginProject}
          onClose={() => setLoginProject(null)}
          onSaved={() => load()}
        />
      )}
    </div>
  );
}
