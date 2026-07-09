'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  Edit2, Plus, Trash2, Save, Move, GripVertical, Phone, Mail,
} from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { apiFetch } from '@/lib/api-client';
import AppModal, { FormField } from '@/components/ui/AppModal';
import AppLoader from '@/components/ui/AppLoader';
import {
  applyDragReorder,
  buildDroppableId,
  parseDroppableId,
} from '@/components/kanban/kanban-utils';
import './Kanban.css';

function ManagerCard({
  manager,
  isEditMode,
  canReorder,
  canEditContacts,
  dragHandleProps,
  isDragging,
  onEdit,
  onDelete,
}) {
  return (
    <div className={`manager-card ${isDragging ? 'is-dragging' : ''}`}>
      {isEditMode && canReorder && (
        <button
          type="button"
          className="manager-drag-handle"
          aria-label="Drag to reorder or move"
          {...dragHandleProps}
        >
          <GripVertical size={14} />
        </button>
      )}
      <div className="manager-avatar" aria-hidden="true">{manager.avatar}</div>
      <div className="manager-details">
        <h4>{manager.name}</h4>
        {manager.phone && (
          <p className="manager-meta">
            <Phone size={11} />
            <span>{manager.phone}</span>
          </p>
        )}
        {manager.email && (
          <p className="manager-meta">
            <Mail size={11} />
            <span>{manager.email}</span>
          </p>
        )}
      </div>
      {isEditMode && canEditContacts && (
        <div className="manager-card-actions">
          <button
            type="button"
            className="icon-btn-small"
            title="Edit contact"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onEdit(manager); }}
          >
            <Edit2 size={12} />
          </button>
          <button
            type="button"
            className="icon-btn-small delete"
            title="Delete contact"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onDelete(manager.id); }}
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}
    </div>
  );
}

const KanbanBoard = () => {
  const { isContactLogProjectAdmin, canManageContactLogContacts, canReorderContactLog } = usePermissions();
  const canUseBoard = isContactLogProjectAdmin || canManageContactLogContacts || canReorderContactLog;
  const canEditContacts = canManageContactLogContacts;
  const [projects, setProjects] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [dragSaving, setDragSaving] = useState(false);

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

  const [projectModal, setProjectModal] = useState({ isOpen: false, mode: 'add', project: null });
  const [projectName, setProjectName] = useState('');

  const [managerModal, setManagerModal] = useState({ isOpen: false, mode: 'add', manager: null });
  const [managerForm, setManagerForm] = useState({
    name: '', phone: '', email: '', role: 'admin', projectId: 'unassigned',
  });

  const unassignedId = useMemo(
    () => projects.find((p) => p.isUnassigned)?.id,
    [projects],
  );

  const onDragEnd = async (result) => {
    if (!isEditMode || !canReorderContactLog) return;

    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const dest = parseDroppableId(destination.droppableId);
    if (!dest) return;

    const previous = managers;
    const optimistic = applyDragReorder(managers, draggableId, source, destination);
    setManagers(optimistic);
    setDragSaving(true);

    try {
      await apiFetch('/api/project-contacts/reorder', {
        method: 'PATCH',
        body: JSON.stringify({
          id: draggableId,
          projectId: dest.projectId,
          role: dest.role,
          sortOrder: destination.index,
        }),
      });
    } catch {
      setManagers(previous);
      await loadData();
    } finally {
      setDragSaving(false);
    }
  };

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

  const handleOpenAddManager = (projectId, role) => {
    setManagerForm({
      name: '', phone: '', email: '', role: role || 'admin', projectId: projectId || unassignedId,
    });
    setManagerModal({ isOpen: true, mode: 'add', manager: null });
  };

  const handleOpenEditManager = (manager) => {
    setManagerForm({
      name: manager.name,
      phone: manager.phone || '',
      email: manager.email || '',
      role: manager.role,
      projectId: manager.projectId,
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

  const editModeLabel = isContactLogProjectAdmin || canManageContactLogContacts
    ? 'Edit Mode'
    : 'Reorder Mode';

  if (loading) {
    return (
      <div className="kanban-wrapper">
        <AppLoader label="Loading contact log…" variant="page" />
      </div>
    );
  }

  return (
    <div className="kanban-wrapper">
      <div className="kanban-header">
        <div className="kanban-header-text">
          <h1 className="kanban-title">Contact Log Directory</h1>
          <p className="kanban-subtitle">Project contacts for P&amp;E administration and maintenance teams</p>
        </div>
        <div className="kanban-header-actions">
          {isEditMode && isContactLogProjectAdmin && (
            <button type="button" className="btn-secondary" onClick={handleOpenAddProject}>
              <Plus size={16} /> Add Project
            </button>
          )}
          {canUseBoard && (
            <button
              type="button"
              className={`btn-primary kanban-mode-btn ${isEditMode ? 'is-active' : ''}`}
              onClick={() => setIsEditMode(!isEditMode)}
            >
              {isEditMode ? (
                <><Save size={16} /> View Mode</>
              ) : (isContactLogProjectAdmin || canManageContactLogContacts) ? (
                <><Edit2 size={16} /> {editModeLabel}</>
              ) : (
                <><Move size={16} /> Reorder Mode</>
              )}
            </button>
          )}
        </div>
      </div>

      {isEditMode && canReorderContactLog && (
        <div className="kanban-edit-banner">
          <Move size={16} />
          <span>
            Drag contacts using the <strong>grip handle</strong> to move between projects or columns.
            {dragSaving ? ' Saving…' : ''}
          </span>
        </div>
      )}

      <div className="kanban-board">
        <div className="kanban-columns-header">
          <div className="kanban-col-title project-col">Projects</div>
          <div className="kanban-col-title">P&amp;E Administration</div>
          <div className="kanban-col-title">P&amp;E Maintenance</div>
        </div>

        <DragDropContext onDragEnd={onDragEnd}>
          <div className="kanban-swimlanes">
            {projects.map((project) => (
              <div
                className={`swimlane ${project.isUnassigned ? 'unassigned-row' : ''}`}
                key={project.id}
              >
                <div className="swimlane-project project-col">
                  <div className="project-name-wrap">
                    <h3 className="project-name">{project.name}</h3>
                    {project.isUnassigned && (
                      <span className="project-badge">Pool</span>
                    )}
                  </div>
                  {isEditMode && isContactLogProjectAdmin && !project.isUnassigned && (
                    <div className="project-actions">
                      <button
                        type="button"
                        className="icon-btn-small"
                        title="Edit project"
                        onClick={() => handleOpenEditProject(project)}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn-small delete"
                        title="Delete project"
                        onClick={() => deleteProject(project.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>

                <Droppable
                  droppableId={buildDroppableId(project.id, 'admin')}
                  isDropDisabled={!isEditMode || !canReorderContactLog}
                >
                  {(provided, snapshot) => {
                    const columnManagers = managers.filter(
                      (m) => m.projectId === project.id && m.role === 'admin',
                    );
                    return (
                      <div
                        className={`swimlane-cell ${snapshot.isDraggingOver ? 'dragging-over' : ''} ${columnManagers.length === 0 ? 'is-empty' : ''}`}
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                      >
                        <div className="swimlane-cell-inner">
                          {columnManagers.map((manager, index) => (
                            <Draggable
                              key={manager.id}
                              draggableId={manager.id}
                              index={index}
                              isDragDisabled={!isEditMode || !canReorderContactLog}
                            >
                              {(dragProvided, dragSnapshot) => (
                                <div
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  className="manager-card-wrap"
                                >
                                  <ManagerCard
                                    manager={manager}
                                    isEditMode={isEditMode}
                                    canReorder={canReorderContactLog}
                                    canEditContacts={canEditContacts}
                                    dragHandleProps={dragProvided.dragHandleProps}
                                    isDragging={dragSnapshot.isDragging}
                                    onEdit={handleOpenEditManager}
                                    onDelete={handleDeleteManager}
                                  />
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                          {columnManagers.length === 0 && !snapshot.isDraggingOver && (
                            <div className="cell-empty-hint">
                              {isEditMode && canReorderContactLog
                                ? 'Drop administration contacts here'
                                : 'No contacts'}
                            </div>
                          )}
                        </div>
                        {isEditMode && canEditContacts && (
                          <button
                            type="button"
                            className="add-manager-btn"
                            onClick={() => handleOpenAddManager(project.id, 'admin')}
                          >
                            <Plus size={14} /> Add contact
                          </button>
                        )}
                      </div>
                    );
                  }}
                </Droppable>

                <Droppable
                  droppableId={buildDroppableId(project.id, 'maintenance')}
                  isDropDisabled={!isEditMode || !canReorderContactLog}
                >
                  {(provided, snapshot) => {
                    const columnManagers = managers.filter(
                      (m) => m.projectId === project.id && m.role === 'maintenance',
                    );
                    return (
                      <div
                        className={`swimlane-cell ${snapshot.isDraggingOver ? 'dragging-over' : ''} ${columnManagers.length === 0 ? 'is-empty' : ''}`}
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                      >
                        <div className="swimlane-cell-inner">
                          {columnManagers.map((manager, index) => (
                            <Draggable
                              key={manager.id}
                              draggableId={manager.id}
                              index={index}
                              isDragDisabled={!isEditMode || !canReorderContactLog}
                            >
                              {(dragProvided, dragSnapshot) => (
                                <div
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  className="manager-card-wrap"
                                >
                                  <ManagerCard
                                    manager={manager}
                                    isEditMode={isEditMode}
                                    canReorder={canReorderContactLog}
                                    canEditContacts={canEditContacts}
                                    dragHandleProps={dragProvided.dragHandleProps}
                                    isDragging={dragSnapshot.isDragging}
                                    onEdit={handleOpenEditManager}
                                    onDelete={handleDeleteManager}
                                  />
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                          {columnManagers.length === 0 && !snapshot.isDraggingOver && (
                            <div className="cell-empty-hint">
                              {isEditMode && canReorderContactLog
                                ? 'Drop maintenance contacts here'
                                : 'No contacts'}
                            </div>
                          )}
                        </div>
                        {isEditMode && canEditContacts && (
                          <button
                            type="button"
                            className="add-manager-btn"
                            onClick={() => handleOpenAddManager(project.id, 'maintenance')}
                          >
                            <Plus size={14} /> Add contact
                          </button>
                        )}
                      </div>
                    );
                  }}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      </div>

      <AppModal
        open={projectModal.isOpen}
        title={projectModal.mode === 'add' ? 'Add Project' : 'Edit Project'}
        onClose={() => setProjectModal((prev) => ({ ...prev, isOpen: false }))}
        onSubmit={handleProjectSubmit}
        submitLabel="Save"
      >
        <FormField label="Project Name" full>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Enter project name..."
            autoFocus
            required
          />
        </FormField>
      </AppModal>

      <AppModal
        open={managerModal.isOpen}
        title={managerModal.mode === 'add' ? 'Add Contact' : 'Edit Contact'}
        onClose={() => setManagerModal((prev) => ({ ...prev, isOpen: false }))}
        onSubmit={handleManagerSubmit}
        submitLabel="Save"
        large
      >
        <div className="production-form-grid">
          <FormField label="Full Name" full>
            <input
              type="text"
              value={managerForm.name}
              onChange={(e) => setManagerForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Enter contact name..."
              autoFocus
              required
            />
          </FormField>
          <FormField label="Phone Number">
            <input
              type="text"
              value={managerForm.phone}
              onChange={(e) => setManagerForm((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="e.g. +251 911 234 567"
            />
          </FormField>
          <FormField label="Email Address">
            <input
              type="email"
              value={managerForm.email}
              onChange={(e) => setManagerForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="e.g. name@ecwc.gov.et"
            />
          </FormField>
          <FormField label="Role / Column">
            <select
              value={managerForm.role}
              onChange={(e) => setManagerForm((prev) => ({ ...prev, role: e.target.value }))}
            >
              <option value="admin">Administration</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </FormField>
          <FormField label="Project / Swimlane">
            <select
              value={managerForm.projectId}
              onChange={(e) => setManagerForm((prev) => ({ ...prev, projectId: e.target.value }))}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </FormField>
        </div>
      </AppModal>
    </div>
  );
};

export default KanbanBoard;
