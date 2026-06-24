'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Edit2, Plus, Trash2, Save, Move } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { apiFetch } from '@/lib/api-client';
import './Kanban.css';

const KanbanBoard = () => {
  const { isContactLogAdmin, canReorderContactLog } = usePermissions();
  const canUseBoard = isContactLogAdmin || canReorderContactLog;
  const [projects, setProjects] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);

  const loadData = useCallback(async () => {
    const [p, m] = await Promise.all([
      apiFetch('/api/projects'),
      apiFetch('/api/project-contacts'),
    ]);
    setProjects(p);
    setManagers(m);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Modals state
  const [projectModal, setProjectModal] = useState({ isOpen: false, mode: 'add', project: null });
  const [projectName, setProjectName] = useState('');

  const [managerModal, setManagerModal] = useState({ isOpen: false, mode: 'add', manager: null });
  const [managerForm, setManagerForm] = useState({ name: '', phone: '', email: '', role: 'admin', projectId: 'unassigned' });

  const onDragEnd = (result) => {
    if (!isEditMode || !canReorderContactLog) return;
    
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const [destProjectId, destRole] = destination.droppableId.split('-');
    
    const dragged = managers.find((m) => m.id === draggableId);
    if (!dragged) return;

    apiFetch('/api/project-contacts/reorder', {
      method: 'PATCH',
      body: JSON.stringify({
        id: draggableId,
        projectId: destProjectId,
        role: destRole,
        sortOrder: destination.index,
      }),
    }).then(() => loadData());
  };

  // Projects handlers
  const handleOpenAddProject = () => {
    setProjectName('');
    setProjectModal({ isOpen: true, mode: 'add', project: null });
  };

  const handleOpenEditProject = (project) => {
    setProjectName(project.name);
    setProjectModal({ isOpen: true, mode: 'edit', project });
  };

  const deleteProject = async (projectId) => {
    if (!window.confirm('Are you sure? Managers will be moved to Unassigned.')) return;
    await apiFetch(`/api/projects/${projectId}`, { method: 'DELETE' });
    await loadData();
  };

  const handleProjectSubmit = async (e) => {
    e.preventDefault();
    if (!projectName.trim()) return;
    if (projectModal.mode === 'add') {
      await apiFetch('/api/projects', { method: 'POST', body: JSON.stringify({ name: projectName.trim() }) });
    } else {
      await apiFetch(`/api/projects/${projectModal.project.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: projectName.trim() }),
      });
    }
    setProjectModal({ isOpen: false, mode: 'add', project: null });
    await loadData();
  };

  // Managers handlers
  const unassignedId = projects.find((p) => p.isUnassigned)?.id;

  const handleOpenAddManager = (projectId, role) => {
    setManagerForm({ name: '', phone: '', email: '', role: role || 'admin', projectId: projectId || unassignedId });
    setManagerModal({ isOpen: true, mode: 'add', manager: null });
  };

  const handleOpenEditManager = (manager) => {
    setManagerForm({
      name: manager.name,
      phone: manager.phone || '',
      email: manager.email || '',
      role: manager.role,
      projectId: manager.projectId
    });
    setManagerModal({ isOpen: true, mode: 'edit', manager });
  };

  const handleDeleteManager = async (managerId) => {
    if (!window.confirm('Are you sure you want to delete this manager?')) return;
    await apiFetch(`/api/project-contacts/${managerId}`, { method: 'DELETE' });
    await loadData();
  };

  const handleManagerSubmit = async (e) => {
    e.preventDefault();
    if (!managerForm.name.trim()) return;
    const payload = {
      name: managerForm.name.trim(),
      phone: managerForm.phone.trim(),
      email: managerForm.email.trim(),
      role: managerForm.role,
      projectId: managerForm.projectId,
    };
    if (managerModal.mode === 'add') {
      await apiFetch('/api/project-contacts', { method: 'POST', body: JSON.stringify(payload) });
    } else {
      await apiFetch(`/api/project-contacts/${managerModal.manager.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    }
    setManagerModal({ isOpen: false, mode: 'add', manager: null });
    await loadData();
  };

  if (loading) {
    return <div className="kanban-wrapper"><p>Loading contact log…</p></div>;
  }

  return (
    <div className="kanban-wrapper">
      <div className="kanban-header">
        <h1 className="kanban-title">Contact Log Directory</h1>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {isEditMode && isContactLogAdmin && (
            <button className="btn-primary" onClick={handleOpenAddProject}>
              <Plus size={16}/> Add Project
            </button>
          )}
          {canUseBoard && (
            <button
              className={`btn-primary ${isEditMode ? 'edit-active' : ''}`}
              onClick={() => setIsEditMode(!isEditMode)}
            >
              {isEditMode ? (
                <><Save size={16}/> View Mode</>
              ) : isContactLogAdmin ? (
                <><Edit2 size={16}/> Edit Mode</>
              ) : (
                <><Move size={16}/> Reorder Mode</>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="kanban-board">
        <div className="kanban-columns-header">
          <div className="kanban-col-title project-col">Projects</div>
          <div className="kanban-col-title">P&E Administration</div>
          <div className="kanban-col-title">P&E Maintenance</div>
        </div>

        <DragDropContext onDragEnd={onDragEnd}>
          <div className="kanban-swimlanes">
            {projects.map(project => (
              <div className={`swimlane ${project.isUnassigned ? 'unassigned-row' : ''}`} key={project.id}>
                {/* Project Column */}
                <div className="swimlane-project project-col">
                  <h3 className="project-name">{project.name}</h3>
                  {isEditMode && isContactLogAdmin && !project.isUnassigned && (
                    <div className="project-actions">
                      <button className="icon-btn-small" title="Edit Project" onClick={() => handleOpenEditProject(project)}><Edit2 size={14}/></button>
                      <button className="icon-btn-small delete" title="Delete Project" onClick={() => deleteProject(project.id)}><Trash2 size={14}/></button>
                    </div>
                  )}
                </div>

                {/* Admin Column */}
                <Droppable droppableId={`${project.id}-admin`} isDropDisabled={!isEditMode || !canReorderContactLog}>
                  {(provided, snapshot) => (
                    <div 
                      className={`swimlane-cell ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                    >
                      {managers.filter(m => m.projectId === project.id && m.role === 'admin').map((manager, index) => (
                        <Draggable key={manager.id} draggableId={manager.id} index={index} isDragDisabled={!isEditMode || !canReorderContactLog}>
                          {(provided, snapshot) => (
                            <div
                              className={`manager-card ${snapshot.isDragging ? 'is-dragging' : ''}`}
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            >
                              <div className="manager-avatar">{manager.avatar}</div>
                              <div className="manager-details">
                                <h4>{manager.name}</h4>
                                <p>{manager.phone}</p>
                                <p>{manager.email}</p>
                              </div>
                              {isEditMode && isContactLogAdmin && (
                                <div className="absolute-top-right" style={{ display: 'flex', gap: '4px' }}>
                                  <button className="icon-btn-small" title="Edit Manager" onClick={() => handleOpenEditManager(manager)}><Edit2 size={12}/></button>
                                  <button className="icon-btn-small delete" title="Delete Manager" onClick={() => handleDeleteManager(manager.id)}><Trash2 size={12}/></button>
                                </div>
                              )}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {isEditMode && isContactLogAdmin && (
                        <button className="add-manager-btn" onClick={() => handleOpenAddManager(project.id, 'admin')}><Plus size={14}/> Add Manager</button>
                      )}
                    </div>
                  )}
                </Droppable>

                {/* Maintenance Column */}
                <Droppable droppableId={`${project.id}-maintenance`} isDropDisabled={!isEditMode || !canReorderContactLog}>
                  {(provided, snapshot) => (
                    <div 
                      className={`swimlane-cell ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                    >
                      {managers.filter(m => m.projectId === project.id && m.role === 'maintenance').map((manager, index) => (
                        <Draggable key={manager.id} draggableId={manager.id} index={index} isDragDisabled={!isEditMode || !canReorderContactLog}>
                          {(provided, snapshot) => (
                            <div
                              className={`manager-card ${snapshot.isDragging ? 'is-dragging' : ''}`}
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            >
                              <div className="manager-avatar">{manager.avatar}</div>
                              <div className="manager-details">
                                <h4>{manager.name}</h4>
                                <p>{manager.phone}</p>
                                <p>{manager.email}</p>
                              </div>
                              {isEditMode && isContactLogAdmin && (
                                <div className="absolute-top-right" style={{ display: 'flex', gap: '4px' }}>
                                  <button className="icon-btn-small" title="Edit Manager" onClick={() => handleOpenEditManager(manager)}><Edit2 size={12}/></button>
                                  <button className="icon-btn-small delete" title="Delete Manager" onClick={() => handleDeleteManager(manager.id)}><Trash2 size={12}/></button>
                                </div>
                              )}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {isEditMode && isContactLogAdmin && (
                        <button className="add-manager-btn" onClick={() => handleOpenAddManager(project.id, 'maintenance')}><Plus size={14}/> Add Manager</button>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      </div>

      {/* Project Modal */}
      {projectModal.isOpen && (
        <div className="kanban-modal-overlay" onClick={() => setProjectModal(prev => ({ ...prev, isOpen: false }))}>
          <div className="kanban-modal-content" onClick={e => e.stopPropagation()}>
            <h2>{projectModal.mode === 'add' ? 'Add Project' : 'Edit Project'}</h2>
            <form onSubmit={handleProjectSubmit}>
              <div className="kanban-form-group">
                <label>Project Name</label>
                <input 
                  type="text" 
                  value={projectName} 
                  onChange={e => setProjectName(e.target.value)} 
                  placeholder="Enter project name..."
                  autoFocus
                  required
                />
              </div>
              <div className="kanban-modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setProjectModal(prev => ({ ...prev, isOpen: false }))}>Cancel</button>
                <button type="submit" className="btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manager Modal */}
      {managerModal.isOpen && (
        <div className="kanban-modal-overlay" onClick={() => setManagerModal(prev => ({ ...prev, isOpen: false }))}>
          <div className="kanban-modal-content" onClick={e => e.stopPropagation()}>
            <h2>{managerModal.mode === 'add' ? 'Add Manager' : 'Edit Manager'}</h2>
            <form onSubmit={handleManagerSubmit}>
              <div className="kanban-form-group">
                <label>Full Name</label>
                <input 
                  type="text" 
                  value={managerForm.name} 
                  onChange={e => setManagerForm(prev => ({ ...prev, name: e.target.value }))} 
                  placeholder="Enter manager's name..."
                  autoFocus
                  required
                />
              </div>
              <div className="kanban-form-group">
                <label>Phone Number</label>
                <input 
                  type="text" 
                  value={managerForm.phone} 
                  onChange={e => setManagerForm(prev => ({ ...prev, phone: e.target.value }))} 
                  placeholder="e.g. +251 911 234 567"
                />
              </div>
              <div className="kanban-form-group">
                <label>Email Address</label>
                <input 
                  type="email" 
                  value={managerForm.email} 
                  onChange={e => setManagerForm(prev => ({ ...prev, email: e.target.value }))} 
                  placeholder="e.g. name@ecwc.gov.et"
                />
              </div>
              <div className="kanban-form-row">
                <div className="kanban-form-group">
                  <label>Role / Column</label>
                  <select 
                    value={managerForm.role} 
                    onChange={e => setManagerForm(prev => ({ ...prev, role: e.target.value }))}
                  >
                    <option value="admin">Administration</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
                <div className="kanban-form-group">
                  <label>Project / Swimlane</label>
                  <select 
                    value={managerForm.projectId} 
                    onChange={e => setManagerForm(prev => ({ ...prev, projectId: e.target.value }))}
                  >
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="kanban-modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setManagerModal(prev => ({ ...prev, isOpen: false }))}>Cancel</button>
                <button type="submit" className="btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default KanbanBoard;
