/**
 * Client-side table sorting utilities.
 * Optimized for large datasets via precomputed keys when sorting.
 */

export function compareValues(a, b, type, direction) {
  const emptyA = isEmpty(a);
  const emptyB = isEmpty(b);
  if (emptyA && emptyB) return 0;
  if (emptyA) return 1;
  if (emptyB) return -1;

  if (type === 'number' || type === 'date') {
    const numA = type === 'date' ? toTimestamp(a) : Number(a);
    const numB = type === 'date' ? toTimestamp(b) : Number(b);
    if (Number.isNaN(numA) && Number.isNaN(numB)) return 0;
    if (Number.isNaN(numA)) return direction === 'desc' ? -1 : 1;
    if (Number.isNaN(numB)) return direction === 'desc' ? 1 : -1;
    const diff = numA - numB;
    return direction === 'desc' ? -diff : diff;
  }

  const diff = String(a).localeCompare(String(b), undefined, { sensitivity: 'base', numeric: true });
  return direction === 'desc' ? -diff : diff;
}

function isEmpty(value) {
  return value === null || value === undefined || value === '' || Number.isNaN(value);
}

function toTimestamp(value) {
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? NaN : t;
}

/**
 * Sort an array using a getValue extractor. Precomputes keys once for performance.
 */
export function sortTableData(items, { column, direction, type, getValue }) {
  if (!column || !direction || items.length < 2) return items;

  const indexed = items.map((item, index) => ({
    item,
    index,
    value: getValue(item, column),
  }));

  indexed.sort((a, b) => {
    const cmp = compareValues(a.value, b.value, type, direction);
    return cmp !== 0 ? cmp : a.index - b.index;
  });

  return indexed.map(({ item }) => item);
}

export function nextSortDirection(currentColumn, clickedColumn, currentDirection) {
  if (currentColumn !== clickedColumn) return 'asc';
  return currentDirection === 'asc' ? 'desc' : 'asc';
}
