import React from 'react';
import StatCard from './StatCard';
import { Truck, Activity } from 'lucide-react';

const ProjectDashboard = () => {
  return (
    <>
      <div className="dashboard-grid">
        <StatCard 
          title="Assigned Equipment" 
          value="45" 
          icon={<Truck size={24} />} 
        />
        <StatCard 
          title="Active on Site" 
          value="38" 
          icon={<Activity size={24} />} 
          trend={{ type: 'positive', text: '84% Utilization' }}
        />
      </div>

      <div className="dashboard-section">
        <h3 className="section-title">Recent Job Orders</h3>
        <p style={{ color: 'var(--text-muted)' }}>No active job orders for this project.</p>
      </div>
    </>
  );
};

export default ProjectDashboard;
