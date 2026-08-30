import {useMemo, useState} from 'react';
import type {DayFlow} from '../../lib/selectors';
import {compactMoney, money} from '../../lib/format';

const W = 720;
const H = 250;
const PAD = {top: 16, right: 12, bottom: 26, left: 46};

type Props = {
  flow: DayFlow[];
  mesLabel: string;
};

/**
 * Uma só escala de valor para as três séries (nunca eixo duplo).
 * A codificação secundária é proposital: o saldo é linha com área, entradas e
 * saídas são barras que partem da linha zero em sentidos opostos. Assim as
 * séries continuam distinguíveis sem depender da cor.
 */
export const CashflowChart = ({flow, mesLabel}: Props) => {
  const [hover, setHover] = useState<number | null>(null);

  const geometry = useMemo(() => {
    const values = flow.flatMap(item => [item.saldo, item.entradas, -item.saidas, 0]);
    const rawMax = Math.max(...values, 0);
    const rawMin = Math.min(...values, 0);
    const span = rawMax - rawMin || 1;
    const max = rawMax + span * 0.08;
    const min = rawMin - span * 0.08;
    const innerW = W - PAD.left - PAD.right;
    const innerH = H - PAD.top - PAD.bottom;
    const x = (day: number) => PAD.left + (innerW * (day - 1)) / Math.max(flow.length - 1, 1);
    const y = (value: number) => PAD.top + innerH - ((value - min) / (max - min)) * innerH;
    const step = innerW / Math.max(flow.length - 1, 1);
    const ticks = [min, min + (max - min) / 2, max];
    return {x, y, step, min, max, ticks, zero: y(0), innerW, innerH};
  }, [flow]);

  const linePath = flow
    .map((item, index) => `${index === 0 ? 'M' : 'L'}${geometry.x(item.day).toFixed(1)},${geometry.y(item.saldo).toFixed(1)}`)
    .join(' ');
  const areaPath = `${linePath} L${geometry.x(flow[flow.length - 1]?.day || 1).toFixed(1)},${geometry.zero.toFixed(1)} L${geometry.x(1).toFixed(1)},${geometry.zero.toFixed(1)} Z`;

  const barWidth = Math.max(Math.min(geometry.step * 0.26, 6), 2);
  const active = hover === null ? null : flow[hover];
  const tipLeft = active ? `${((geometry.x(active.day) / W) * 100).toFixed(2)}%` : '0';
  const tipSide = active && geometry.x(active.day) > W * 0.6 ? -1 : 1;

  return (
    <div className="viz">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Fluxo de caixa de ${mesLabel}: saldo projetado, entradas e saídas por dia`}
        onMouseLeave={() => setHover(null)}>
        <g className="viz-grid">
          {geometry.ticks.map(value => (
            <line key={value} x1={PAD.left} x2={W - PAD.right} y1={geometry.y(value)} y2={geometry.y(value)} />
          ))}
          <line x1={PAD.left} x2={W - PAD.right} y1={geometry.zero} y2={geometry.zero} />
        </g>

        <g className="viz-axis">
          {geometry.ticks.map(value => (
            <text key={value} x={PAD.left - 8} y={geometry.y(value) + 3.5} textAnchor="end">
              {compactMoney(value)}
            </text>
          ))}
          {flow
            .filter(item => item.day === 1 || item.day % 5 === 0)
            .map(item => (
              <text key={item.day} x={geometry.x(item.day)} y={H - 8} textAnchor="middle">
                {item.day}
              </text>
            ))}
        </g>

        <path className="viz-area" d={areaPath} />
        <path className="viz-line" d={linePath} />

        {flow.map(item => (
          <g key={item.day}>
            {item.entradas > 0 && (
              <rect
                className="viz-bar-in"
                x={geometry.x(item.day) - barWidth / 2}
                y={geometry.y(item.entradas)}
                width={barWidth}
                height={Math.max(geometry.zero - geometry.y(item.entradas), 1)}
                rx={2}
              />
            )}
            {item.saidas > 0 && (
              <rect
                className="viz-bar-out"
                x={geometry.x(item.day) - barWidth / 2}
                y={geometry.zero}
                width={barWidth}
                height={Math.max(geometry.y(-item.saidas) - geometry.zero, 1)}
                rx={2}
              />
            )}
          </g>
        ))}

        {active && (
          <g>
            <line className="viz-cursor" x1={geometry.x(active.day)} x2={geometry.x(active.day)} y1={PAD.top} y2={H - PAD.bottom} />
            <circle className="viz-dot" cx={geometry.x(active.day)} cy={geometry.y(active.saldo)} r={4.5} />
          </g>
        )}

        {flow.map((item, index) => (
          <rect
            key={`hit-${item.day}`}
            className="viz-hit"
            x={geometry.x(item.day) - geometry.step / 2}
            y={PAD.top}
            width={Math.max(geometry.step, 8)}
            height={geometry.innerH}
            onMouseEnter={() => setHover(index)}
            onFocus={() => setHover(index)}
          />
        ))}
      </svg>

      {active && (
        <div
          className="viz-tip"
          style={{
            left: tipLeft,
            top: 8,
            transform: `translateX(${tipSide === 1 ? '12px' : 'calc(-100% - 12px)'})`,
          }}>
          <strong>Dia {active.day}</strong>
          <div className="viz-tip-row">
            <span><i className="viz-swatch-line" style={{background: 'var(--series-bal)'}} /> Saldo projetado</span>
            <b>{money(active.saldo)}</b>
          </div>
          <div className="viz-tip-row">
            <span><i className="viz-swatch-bar" style={{background: 'var(--series-in)'}} /> Entradas</span>
            <b>{money(active.entradas)}</b>
          </div>
          <div className="viz-tip-row">
            <span><i className="viz-swatch-bar" style={{background: 'var(--series-out)'}} /> Saídas</span>
            <b>{money(active.saidas)}</b>
          </div>
        </div>
      )}

      <div className="viz-legend" style={{marginTop: 12}}>
        <span className="viz-legend-item"><i className="viz-swatch-line" style={{background: 'var(--series-bal)'}} /> Saldo projetado</span>
        <span className="viz-legend-item"><i className="viz-swatch-bar" style={{background: 'var(--series-in)'}} /> Entradas</span>
        <span className="viz-legend-item"><i className="viz-swatch-bar" style={{background: 'var(--series-out)'}} /> Saídas</span>
      </div>
    </div>
  );
};
