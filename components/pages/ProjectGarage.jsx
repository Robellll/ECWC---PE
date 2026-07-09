'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, User, ChevronRight, Key } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { apiFetch } from '@/lib/api-client';
import ProjectSiteLoginModal from '@/components/garage/ProjectSiteLoginModal';
import SearchBar from '@/components/shared/SearchBar';
import AppLoader from '@/components/ui/AppLoader';
import './ProjectGarage.css';

const ProjectGarage = () => {
  const router = useRouter();
  const { isProjPEAdmin, isProjPEMaintenance, isSuperAdmin } = usePermissions();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loginProject, setLoginProject] = useState(null);
  const [search, setSearch] = useState('');

  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) => p.name.toLowerCase().includes(q));
  }, [projects, search]);

  const loadProjects = useCallback(async () => {
    const data = await apiFetch('/api/project-garage');
    setProjects(data);
    setLoading(false);
    return data;
  }, []);

  useEffect(() => {
    loadProjects().then((data) => {
      if ((isProjPEAdmin || isProjPEMaintenance) && data.length === 1) {
        router.replace(`/project-garage/${data[0].id}`);
      }
    });
  }, [loadProjects, isProjPEAdmin, isProjPEMaintenance, router]);

  if (loading) {
    return <AppLoader label="Loading project garages…" variant="page" className="project-garage-container" />;
  }

  return (
    <div className="project-garage-container">
      <div className="project-garage-header">
        <div>
          <h1 className="page-title">Project Garage</h1>
          <p className="page-subtitle">Site maintenance at each project — linked to Contact Log projects</p>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="project-garage-empty">
          <Building2 size={40} strokeWidth={1.5} />
          <p>No projects yet. Add a project in Contact Log to get started.</p>
        </div>
      ) : (
        <>
          <div className="pg-search-wrap">
            <SearchBar
              className="pg-search-bar"
              iconClassName="pg-search-icon"
              value={search}
              onChange={setSearch}
              placeholder="Search projects by name…"
              ariaLabel="Search projects"
            />
          </div>

          {filteredProjects.length === 0 ? (
            <div className="project-garage-empty pg-search-empty">
              <p>No projects match &ldquo;{search.trim()}&rdquo;.</p>
            </div>
          ) : (
        <div className="project-garage-grid">
          {filteredProjects.map((project) => (
            <article key={project.id} className="project-garage-card">
              <button
                type="button"
                className="pg-card-main"
                onClick={() => router.push(`/project-garage/${project.id}`)}
              >
                <div className="pg-card-accent" aria-hidden="true" />

                <header className="pg-card-header">
                  <div className="pg-card-title-row">
                    <span className="pg-card-badge"><Building2 size={16} /></span>
                    <h2 className="pg-card-title">{project.name}</h2>
                  </div>
                  <span className="pg-open-link">
                    Open <ChevronRight size={15} />
                  </span>
                </header>

                <div className="pg-metrics">
                  <div className="pg-metric pg-metric--progress">
                    <span className="pg-metric-value">{project.inProgressCount}</span>
                    <span className="pg-metric-label">In progress</span>
                  </div>
                  <div className="pg-metric pg-metric--done">
                    <span className="pg-metric-value">{project.completedCount}</span>
                    <span className="pg-metric-label">Completed</span>
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
                    {project.totalJobs} total job{project.totalJobs === 1 ? '' : 's'}
                  </span>
                </footer>
              </button>

              {isSuperAdmin && (
                <div className="pg-card-actions">
                  <span className={`pg-site-login-chip ${project.garageEnabled ? '' : 'inactive'}`}>
                    <Key size={11} />
                    {project.garageEnabled ? (project.garageSiteEmail || 'Login active') : 'No site login'}
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
          project={loginProject}
          onClose={() => setLoginProject(null)}
          onSaved={() => loadProjects()}
        />
      )}
    </div>
  );
};

export default ProjectGarage;
