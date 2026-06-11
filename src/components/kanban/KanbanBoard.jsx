import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Edit2, Plus, Trash2, Save } from 'lucide-react';
import './Kanban.css';

const initialProjects = [
  { id: 'p1', name: 'Grand Ethiopian Renaissance Dam (GERD)' },
  { id: 'p2', name: 'Awash-Kombolcha Highway' },
  { id: 'unassigned', name: 'Idle / Unassigned Managers', isUnassigned: true }
];

const initialManagers = [
  { id: 'm1', name: 'Abebe Bekele', phone: '+251 911 234 567', email: 'abebe@ecwc.gov.et', role: 'admin', projectId: 'p1', avatar: 'AB' },
  { id: 'm2', name: 'Helen Tadesse', phone: '+251 922 345 678', email: 'helen@ecwc.gov.et', role: 'maintenance', projectId: 'p1', avatar: 'HT' },
  { id: 'm3', name: 'Dawit Yohannes', phone: '+251 933 456 789', email: 'dawit@ecwc.gov.et', role: 'admin', projectId: 'p2', avatar: 'DY' },
  { id: 'm4', name: 'Sara Alemu', phone: '+251 944 567 890', email: 'sara@ecwc.gov.et', role: 'admin', projectId: 'unassigned', avatar: 'SA' }
];

const KanbanBoard = () => {
  const [projects, setProjects] = useState(initialProjects);
  const [managers, setManagers] = useState(initialManagers);
  const [isEditMode, setIsEditMode] = useState(false);

  // Modals state
  const [projectModal, setProjectModal] = useState({ isOpen: false, mode: 'add', project: null });
  const [projectName, setProjectName] = useState('');

  const [managerModal, setManagerModal] = useState({ isOpen: false, mode: 'add', manager: null });
  const [managerForm, setManagerForm] = useState({ name: '', phone: '', email: '', role: 'admin', projectId: 'unassigned' });

  const onDragEnd = (result) => {
    if (!isEditMode) return;
    
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const [destProjectId, destRole] = destination.droppableId.split('-');
    
    setManagers(prev => {
      const dragged = prev.find(m => m.id === draggableId);
      if (!dragged) return prev;

      const updatedDragged = {
        ...dragged,
        projectId: destProjectId,
        role: destRole
      };

      const withoutDragged = prev.filter(m => m.id !== draggableId);
      const destManagers = withoutDragged.filter(m => m.projectId === destProjectId && m.role === destRole);

      if (destManagers.length === 0) {
        return [...withoutDragged, updatedDragged];
      }

      if (destination.index >= destManagers.length) {
        const lastDestManager = destManagers[destManagers.length - 1];
        const lastIndex = withoutDragged.findIndex(m => m.id === lastDestManager.id);
        const resultList = [...withoutDragged];
        resultList.splice(lastIndex + 1, 0, updatedDragged);
        return resultList;
      } else {
        const targetDestManager = destManagers[destination.index];
        const targetIndex = withoutDragged.findIndex(m => m.id === targetDestManager.id);
        const resultList = [...withoutDragged];
        resultList.splice(targetIndex, 0, updatedDragged);
        return resultList;
      }
    });
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

  const deleteProject = (projectId) => {
    if(window.confirm("Are you sure? Managers will be moved to Unassigned.")) {
      setProjects(prev => prev.filter(p => p.id !== projectId));
      setManagers(prev => prev.map(m => m.projectId === projectId ? { ...m, projectId: 'unassigned' } : m));
    }
  };

  const handleProjectSubmit = (e) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    if (projectModal.mode === 'add') {
      const newProject = {
        id: `p_${Date.now()}`,
        name: projectName.trim()
      };
      setProjects(prev => {
        const unassigned = prev.find(p => p.isUnassigned);
        const others = prev.filter(p => !p.isUnassigned);
        return [...others, newProject, unassigned];
      });
    } else {
      setProjects(prev => prev.map(p => p.id === projectModal.project.id ? { ...p, name: projectName.trim() } : p));
    }
    setProjectModal({ isOpen: false, mode: 'add', project: null });
  };

  // Managers handlers
  const handleOpenAddManager = (projectId, role) => {
    setManagerForm({ name: '', phone: '', email: '', role: role || 'admin', projectId: projectId || 'unassigned' });
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

  const handleDeleteManager = (managerId) => {
    if (window.confirm("Are you sure you want to delete this manager?")) {
      setManagers(prev => prev.filter(m => m.id !== managerId));
    }
  };

  const handleManagerSubmit = (e) => {
    e.preventDefault();
    if (!managerForm.name.trim()) return;

    const names = managerForm.name.trim().split(' ');
    const avatar = names.map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'M';

    if (managerModal.mode === 'add') {
      const newManager = {
        id: `m_${Date.now()}`,
        name: managerForm.name.trim(),
        phone: managerForm.phone.trim(),
        email: managerForm.email.trim(),
        role: managerForm.role,
        projectId: managerForm.projectId,
        avatar
      };
      setManagers(prev => [...prev, newManager]);
    } else {
      setManagers(prev => prev.map(m => m.id === managerModal.manager.id ? {
        ...m,
        name: managerForm.name.trim(),
        phone: managerForm.phone.trim(),
        email: managerForm.email.trim(),
        role: managerForm.role,
        projectId: managerForm.projectId,
        avatar
      } : m));
    }
    setManagerModal({ isOpen: false, mode: 'add', manager: null });
  };

  return (
    <div className="kanban-wrapper">
      <div className="kanban-header">
        <h1 className="kanban-title">Contact Log Directory</h1>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {isEditMode && (
            <button className="btn-primary" onClick={handleOpenAddProject}>
              <Plus size={16}/> Add Project
            </button>
          )}
          <button 
            className={`btn-primary ${isEditMode ? 'edit-active' : ''}`}
            onClick={() => setIsEditMode(!isEditMode)}
          >
            {isEditMode ? <><Save size={16}/> View Mode</> : <><Edit2 size={16}/> Edit Mode</>}
          </button>
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
                  {isEditMode && !project.isUnassigned && (
                    <div className="project-actions">
                      <button className="icon-btn-small" title="Edit Project" onClick={() => handleOpenEditProject(project)}><Edit2 size={14}/></button>
                      <button className="icon-btn-small delete" title="Delete Project" onClick={() => deleteProject(project.id)}><Trash2 size={14}/></button>
                    </div>
                  )}
                </div>

                {/* Admin Column */}
                <Droppable droppableId={`${project.id}-admin`} isDropDisabled={!isEditMode}>
                  {(provided, snapshot) => (
                    <div 
                      className={`swimlane-cell ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                    >
                      {managers.filter(m => m.projectId === project.id && m.role === 'admin').map((manager, index) => (
                        <Draggable key={manager.id} draggableId={manager.id} index={index} isDragDisabled={!isEditMode}>
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
                              {isEditMode && (
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
                      {isEditMode && (
                        <button className="add-manager-btn" onClick={() => handleOpenAddManager(project.id, 'admin')}><Plus size={14}/> Add Manager</button>
                      )}
                    </div>
                  )}
                </Droppable>

                {/* Maintenance Column */}
                <Droppable droppableId={`${project.id}-maintenance`} isDropDisabled={!isEditMode}>
                  {(provided, snapshot) => (
                    <div 
                      className={`swimlane-cell ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                    >
                      {managers.filter(m => m.projectId === project.id && m.role === 'maintenance').map((manager, index) => (
                        <Draggable key={manager.id} draggableId={manager.id} index={index} isDragDisabled={!isEditMode}>
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
                              {isEditMode && (
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
                      {isEditMode && (
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
