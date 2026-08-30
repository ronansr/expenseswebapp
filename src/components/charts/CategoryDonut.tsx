import {useState} from 'react';
import type {CategorySlice} from '../../lib/selectors';
import {money} from '../../lib/format';

const SIZE = 168;
const RADIUS = 70;
const THICKNESS = 19;
const GAP = 2; /* respiro de 2px entre fatias, na cor da superficie */

export const CATEGORY_COLORS = [
  'var(--cat-1)',
  'var(--cat-2)',
  'var(--cat-3)',
  'var(--cat-4)',
  'var(--cat-5)',
  'var(--cat-6)',
  'var(--cat-7)',
];

const polar = (angle: number, radius: number) => {
  const rad = ((angle - 90) * Math.PI) / 180;
  return {x: SIZE / 2 + radius * Math.cos(rad), y: SIZE / 2 + radius * Math.sin(rad)};
};

const arcPath = (start: number, end: number) => {
  const outer = RADIUS;
  const inner = RADIUS - THICKNESS;
  const a = polar(start, outer);
  const b = polar(end, outer);
  const c = polar(end, inner);
  const d = polar(start, inner);
  const large = end - start > 180 ? 1 : 0;
  return `M${a.x},${a.y} A${outer},${outer} 0 ${large} 1 ${b.x},${b.y} L${c.x},${c.y} A${inner},${inner} 0 ${large} 0 ${d.x},${d.y} Z`;
};

type Props = {
  slices: CategorySlice[];
  total: number;
};

/**
 * Rosca de identidade (categoria), cores atribuidas em ordem fixa e nunca
 * recicladas. A legenda e sempre visível com rotulo, valor e percentual: e ela
 * que carrega a identidade, não a cor sozinha.
 */
export const CategoryDonut = ({slices, total}: Props) => {
  const [active, setActive] = useState<string | null>(null);
  let cursor = 0;

  const arcs = slices.map((slice, index) => {
    const sweep = slice.share * 360;
    const start = cursor + (sweep > GAP * 2 ? GAP / 2 : 0);
    const end = cursor + sweep - (sweep > GAP * 2 ? GAP / 2 : 0);
    cursor += sweep;
    return {slice, start, end, color: CATEGORY_COLORS[index % CATEGORY_COLORS.length]};
  });

  return (
    <div className="donut-wrap">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE} role="img" aria-label="Gastos por categoria">
        {arcs.map(arc => (
          <path
            key={arc.slice.id}
            className={`donut-slice ${active && active !== arc.slice.id ? 'is-dim' : ''}`.trim()}
            d={arcPath(arc.start, Math.max(arc.end, arc.start + 0.4))}
            fill={arc.color}
            onMouseEnter={() => setActive(arc.slice.id)}
            onMouseLeave={() => setActive(null)}
          />
        ))}
        <g className="donut-center">
          <text className="donut-center-value" x={SIZE / 2} y={SIZE / 2 + 2}>{money(total)}</text>
          <text className="donut-center-label" x={SIZE / 2} y={SIZE / 2 + 18}>Total do mês</text>
        </g>
      </svg>

      <div className="donut-legend">
        {arcs.map(arc => (
          <div
            key={arc.slice.id}
            className="donut-legend-row"
            onMouseEnter={() => setActive(arc.slice.id)}
            onMouseLeave={() => setActive(null)}>
            <i className="donut-dot" style={{background: arc.color}} aria-hidden="true" />
            <span>{arc.slice.label}</span>
            <b className="money">{money(arc.slice.total)}</b>
            <i>{Math.round(arc.slice.share * 100)}%</i>
          </div>
        ))}
      </div>
    </div>
  );
};
