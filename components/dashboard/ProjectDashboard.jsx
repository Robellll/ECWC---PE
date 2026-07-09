'use client';

import React, { useEffect, useState } from 'react';
import StatCard from './StatCard';
import AppLoader from '@/components/ui/AppLoader';
import { HardHat, CheckCircle, Wrench } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';

const ProjectDashboard = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    apiFetch('/api/dashboard/project').then(setData).catch(console.error);
  }, []);

  if (!data) {
    return <AppLoader label="Loading dashboard…" variant="page" />;
  }

  return (
    <>
      <p className="page-subtitle" style={{ marginBottom: '1rem' }}>{data.projectName}</p>
      <div className="dashboard-grid">
        <StatCard
          title="Assigned Equipment"
          value={String(data.assignedEquipment)}
          icon={<HardHat size={24} />}
        />
        <StatCard
          title="Active on Site"
          value={String(data.activeOnSite)}
          icon={<CheckCircle size={24} />}
          trend={{ type: 'positive', text: `${data.utilizationPercent}% utilization` }}
        />
        <StatCard
          title="Garage In Progress"
          value={String(data.garageInProgress)}
          icon={<Wrench size={24} />}
        />
      </div>
    </>
  );
};

export default ProjectDashboard;
