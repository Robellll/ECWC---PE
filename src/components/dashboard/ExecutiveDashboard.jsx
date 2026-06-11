import React from 'react';
import StatCard from './StatCard';
import { Truck, Activity, AlertTriangle, CheckCircle } from 'lucide-react';

const ExecutiveDashboard = () => {
  return (
    <>
      <div className="dashboard-grid">
        <StatCard 
          title="Total Fleet" 
          value="1,248" 
          icon={<Truck size={24} />} 
          trend={{ type: 'positive', text: '+12 this month' }}
        />
        <StatCard 
          title="Active Equipment" 
          value="984" 
          icon={<CheckCircle size={24} />} 
          trend={{ type: 'positive', text: '78.8% Utilization' }}
        />
        <StatCard 
          title="Under Maintenance" 
          value="156" 
          icon={<Activity size={24} />} 
        />
        <StatCard 
          title="Breakdown Alerts" 
          value="24" 
          icon={<AlertTriangle size={24} />} 
          trend={{ type: 'negative', text: 'Needs attention' }}
        />
      </div>

      <div className="dashboard-section">
        <h3 className="section-title">Fleet Utilization by Project</h3>
        <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-main)', borderRadius: '0.5rem', color: 'var(--text-muted)' }}>
          [Chart Placeholder: Bar Chart of Utilization]
        </div>
      </div>
    </>
  );
};

export default ExecutiveDashboard;
