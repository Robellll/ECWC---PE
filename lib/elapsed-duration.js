function plural(n, singular, pluralForm = `${singular}s`) {
  return n === 1 ? `1 ${singular}` : `${n} ${pluralForm}`;
}

/** Break total days into years (365d), months (30d), remaining days */
export function breakdownElapsedDays(totalDays) {
  const safe = Math.max(0, Math.floor(totalDays));
  const years = Math.floor(safe / 365);
  const afterYears = safe % 365;
  const months = Math.floor(afterYears / 30);
  const days = afterYears % 30;
  return { years, months, days, totalDays: safe };
}

/**
 * Human-readable elapsed time since an event.
 * ≤30 days: days only · >30 days: months + days · ≥1 year: years + months + days
 */
export function formatElapsedDays(totalDays) {
  const { years, months, days, totalDays: safe } = breakdownElapsedDays(totalDays);
  if (safe === 0) return 'Today';
  if (safe <= 30) {
    return safe === 1 ? '1 day' : `${safe} days`;
  }
  if (years === 0) {
    const parts = [];
    if (months > 0) parts.push(plural(months, 'month'));
    if (days > 0) parts.push(plural(days, 'day'));
    return parts.join(' ');
  }
  const parts = [plural(years, 'year')];
  if (months > 0) parts.push(plural(months, 'month'));
  if (days > 0) parts.push(plural(days, 'day'));
  return parts.join(' ');
}
