/** droppableId format: `{projectUuid}-admin` | `{projectUuid}-maintenance` */
export function parseDroppableId(droppableId) {
  if (droppableId.endsWith('-maintenance')) {
    return { projectId: droppableId.slice(0, -'-maintenance'.length), role: 'maintenance' };
  }
  if (droppableId.endsWith('-admin')) {
    return { projectId: droppableId.slice(0, -'-admin'.length), role: 'admin' };
  }
  return null;
}

export function buildDroppableId(projectId, role) {
  return `${projectId}-${role}`;
}

export function applyDragReorder(managers, draggableId, source, destination) {
  const dest = parseDroppableId(destination.droppableId);
  const src = parseDroppableId(source.droppableId);
  if (!dest || !src) return managers;

  const dragged = managers.find((m) => m.id === draggableId);
  if (!dragged) return managers;

  const moved = { ...dragged, projectId: dest.projectId, role: dest.role };
  let rest = managers.filter((m) => m.id !== draggableId);

  const columnItems = (projectId, role) =>
    rest.filter((m) => m.projectId === projectId && m.role === role)
      .sort((a, b) => a.sortOrder - b.sortOrder);

  const reindex = (items) => items.map((m, i) => ({ ...m, sortOrder: i }));

  const destItems = columnItems(dest.projectId, dest.role);
  destItems.splice(destination.index, 0, moved);
  const newDest = reindex(destItems);

  rest = rest.filter((m) => !(m.projectId === dest.projectId && m.role === dest.role));

  let newSrc = [];
  if (source.droppableId !== destination.droppableId) {
    const srcItems = columnItems(src.projectId, src.role);
    newSrc = reindex(srcItems);
    rest = rest.filter((m) => !(m.projectId === src.projectId && m.role === src.role));
  }

  return [...rest, ...newSrc, ...newDest];
}
