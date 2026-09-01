import {
  demandStatusLabel,
  plantStatusLabel,
} from './constants.js';

export const PLANT_STATUS_KPI_CARDS = [
  { label: 'Operable Plants', valueKey: 'operablePlants', href: '/production/plants?status=operable' },
  { label: 'Idle Plants', valueKey: 'idlePlants', href: '/production/plants?status=idle' },
  { label: 'Down Plants', valueKey: 'downPlants', href: '/production/plants?status=down', showDownBreakdown: true },
];

export const PRIMARY_KPI_CARDS = [
  { label: 'Total Plants', valueKey: 'totalPlants', href: '/production/plants' },
  { label: "Today's Production", valueKey: 'todayProduction', href: '/production/daily?date=today' },
  { label: 'Current Stock', valueKey: 'currentStock', href: '/production/stock' },
  { label: 'Pending Demand', valueKey: 'pendingDemand', href: '/production/demand?status=pending' },
  { label: 'Completed Demand', valueKey: 'completedDemand', href: '/production/demand?status=completed' },
  { label: "Today's Dispatch", valueKey: 'todayDispatch', href: '/production/dispatch?date=today' },
];

export const INTELLIGENCE_KPI_CARDS = [
  {
    label: 'Demand Fulfillment',
    href: '/production/demand',
    getValue: (i) => `${i.demandFulfillmentPct}%`,
  },
  {
    label: 'Plant Utilization',
    href: '/production/plants?status=operable',
    getValue: (i) => `${i.plantUtilizationPct}%`,
  },
  {
    label: 'Avg Daily Production',
    href: '/production/daily',
    getValue: (i) => i.averageDailyProduction,
  },
  {
    label: 'Production Efficiency',
    href: '/production/plants?status=operable',
    getValue: (i) => `${i.productionEfficiency}%`,
  },
];

export const ALERT_LINKS = {
  low_stock: '/production/stock?health=low',
  overdue_demand: '/production/demand?status=pending',
  idle_plant: '/production/plants?status=idle',
  down_plant: '/production/plants?status=down',
};

export function plantFilterLabel(status) {
  if (!status) return null;
  return `${plantStatusLabel(status)} plants`;
}

export function demandFilterLabel(status) {
  if (!status) return null;
  return `${demandStatusLabel(status)} demand`;
}

export function dateFilterLabel(dateFilter) {
  if (dateFilter === 'today') return "Today's records";
  return null;
}

export function stockHealthFilterLabel(health) {
  if (health === 'low') return 'Low or critical stock';
  return null;
}

export function filterPlants(rows, status) {
  if (!status) return rows;
  return rows.filter((r) => r.status === status);
}

export function filterDemand(rows, status) {
  if (!status) return rows;
  return rows.filter((r) => r.status === status);
}

export function filterByToday(rows, dateField, dateFilter) {
  if (dateFilter !== 'today') return rows;
  const today = new Date().toISOString().slice(0, 10);
  return rows.filter((r) => {
    const d = r[dateField]?.slice?.(0, 10) || r[dateField];
    return d === today;
  });
}

export function filterStockByHealth(rows, health) {
  if (health !== 'low') return rows;
  return rows.filter((r) => r.health !== 'healthy');
}
