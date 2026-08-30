import type {ReactNode} from 'react';
import {ChevronDown} from 'lucide-react';

type FieldProps = {
  label: string;
  hint?: string;
  error?: string;
  wide?: boolean;
  children: ReactNode;
};

/** Rotulo acima, dica opcional, erro abaixo. Nunca placeholder como rotulo. */
export const Field = ({label, hint, error, wide, children}: FieldProps) => (
  <label className={`field ${wide ? 'field-wide' : ''}`.trim()}>
    <span>{label}</span>
    {children}
    {hint && !error && <small className="field-hint">{hint}</small>}
    {error && <small className="field-error">{error}</small>}
  </label>
);

export const SelectWrap = ({children}: {children: ReactNode}) => (
  <span className="select-wrap">
    {children}
    <ChevronDown size={16} />
  </span>
);
