import React from 'react';
import KanbanBoard from '../components/kanban/KanbanBoard';

const ContactLog = () => {
  return (
    <div style={{ padding: '1.5rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <KanbanBoard />
    </div>
  );
};

export default ContactLog;
