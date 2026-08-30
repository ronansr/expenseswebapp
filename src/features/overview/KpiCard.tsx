import type {LucideIcon} from 'lucide-react';
import {money} from '../../lib/format';

type Props = {
  label: string;
  value: number;
  footnote?: string;
  icon: LucideIcon;
  tone?: 'good' | 'bad' | 'warn' | 'info';
};

export const KpiCard = ({label, value, footnote, icon: Icon, tone}: Props) => (
  <article className="card kpi">
    <div className="kpi-text">
      <span className="kpi-label">{label}</span>
      <strong className={`kpi-value ${tone ? `text-${tone}` : ''}`.trim()}>{money(value)}</strong>
      {footnote && <span className="kpi-foot">{footnote}</span>}
    </div>
    <span className={`kpi-icon ${tone ? `tone-${tone}` : ''}`.trim()} aria-hidden="true">
      <Icon size={18} strokeWidth={1.9} />
    </span>
  </article>
);
