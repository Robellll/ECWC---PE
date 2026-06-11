'use client';

import React from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import ExecutiveDashboard from '@/components/dashboard/ExecutiveDashboard';
import ProjectDashboard from '@/components/dashboard/ProjectDashboard';
import '@/components/dashboard/Dashboard.css';

const Dashboard = () => {
  const { isExecutive } = usePermissions();

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1 className="dashboard-title">
          {isExecutive ? 'Executive Dashboard' : 'Project Dashboard'}
        </h1>
      </div>
      {isExecutive ? <ExecutiveDashboard /> : <ProjectDashboard />}
    </div>
  );
};

export default Dashboard;
