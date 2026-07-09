'use client';

import React, { useEffect, useState } from 'react';
import StatCard from './StatCard';
import AppLoader from '@/components/ui/AppLoader';
import { Truck, Activity, AlertTriangle, CheckCircle } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';

const ExecutiveDashboard = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    apiFetch('/api/dashboard/executive').then(setData).catch(console.error);
  }, []);

  if (!data) {
    return <AppLoader label="Loading dashboard…" variant="page" />;
  }

  return (
    <>
      <div className="dashboard-grid">
        <StatCard
          title="Total Fleet"
          value={data.totalFleet.toLocaleString()}
          icon={<Truck size={24} />}
          trend={{ type: 'positive', text: `${data.garageInProgress} in garage` }}
        />
        <StatCard
          title="Active Equipment"
          value={data.activeEquipment.toLocaleString()}
          icon={<CheckCircle size={24} />}
          trend={{ type: 'positive', text: `${data.utilizationPercent}% Utilization` }}
        />
        <StatCard
          title="Under Maintenance"
          value={data.underMaintenance.toLocaleString()}
          icon={<Activity size={24} />}
        />
        <StatCard
          title="Breakdown Alerts"
          value={data.breakdownAlerts.toLocaleString()}
          icon={<AlertTriangle size={24} />}
          trend={{ type: 'negative', text: `${data.openInsuranceClaims} open claims` }}
        />
      </div>

      <div className="dashboard-section">
        <h3 className="section-title">Fleet Utilization by Project</h3>
        <div className="project-util-list">
          {data.byProject.map((p) => (
            <div key={p.name} className="project-util-row">
              <span>{p.name}</span>
              <span>{p.operational}/{p.total} operational</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default ExecutiveDashboard;
