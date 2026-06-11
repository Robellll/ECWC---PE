import React from 'react';
import { useStore, getRolePermissions } from '../store/useStore';
import ExecutiveDashboard from '../components/dashboard/ExecutiveDashboard';
import ProjectDashboard from '../components/dashboard/ProjectDashboard';
import '../components/dashboard/Dashboard.css';

const Dashboard = () => {
  const userRole = useStore(state => state.userRole);
  const { isExecutive, isProjectAdmin } = getRolePermissions(userRole);

  const renderDashboard = () => {
    if (isExecutive) {
      return <ExecutiveDashboard />;
    } else {
      return <ProjectDashboard />;
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1 className="dashboard-title">
          {isExecutive ? 'Executive Dashboard' : 'Project Dashboard'}
        </h1>
      </div>
      {renderDashboard()}
    </div>
  );
};

export default Dashboard;
