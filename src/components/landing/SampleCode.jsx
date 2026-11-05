const SIZE = 21;
const FINDERS = [[0, 0], [14, 0], [0, 14]];

function isFinderCell(x, y) {
  return FINDERS.some(([left, top]) => x >= left && x < left + 7 && y >= top && y < top + 7);
}

function isFinderInk(x, y) {
  return FINDERS.some(([left, top]) => {
    const column = x - left;
    const row = y - top;
    if (column < 0 || column > 6 || row < 0 || row > 6) return false;
    const isBorder = column === 0 || column === 6 || row === 0 || row === 6;
    const isCenter = column >= 2 && column <= 4 && row >= 2 && row <= 4;
    return isBorder || isCenter;
  });
}

const CELLS = Array.from({ length: SIZE * SIZE }, (_, index) => {
  const x = index % SIZE;
  const y = Math.floor(index / SIZE);
  const filled = isFinderCell(x, y) ? isFinderInk(x, y) : (x * 7 + y * 13 + x * y) % 3 === 0;
  return filled ? { x, y } : null;
}).filter(Boolean);

/** Código decorativo de la tarjeta de ejemplo: no se puede escanear. */
export function SampleCode() {
  return (
    <svg className="sample-code" viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label="Código de ejemplo, no se puede escanear" shapeRendering="crispEdges">
      {CELLS.map(({ x, y }) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="currentColor" />
      ))}
    </svg>
  );
}
