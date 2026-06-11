import React from 'react';

const StatCard = ({ title, value, icon, colorClass, trend }) => {
  return (
    <div className={`stat-card ${colorClass || ''}`}>
      <div className="stat-card-header">
        <h3 className="stat-card-title">{title}</h3>
        <div className="stat-card-icon">{icon}</div>
      </div>
      <div className="stat-card-body">
        <p className="stat-card-value">{value}</p>
        {trend && <span className={`stat-card-trend ${trend.type}`}>{trend.text}</span>}
      </div>
    </div>
  );
};

export default StatCard;
