import type {ReactNode} from 'react';

type CardProps = {
  children: ReactNode;
  className?: string;
};

export const Card = ({children, className = ''}: CardProps) => (
  <section className={`card ${className}`.trim()}>{children}</section>
);

type CardHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
};

export const CardHeader = ({title, subtitle, actions}: CardHeaderProps) => (
  <header className="card-head">
    <div>
      <h2>{title}</h2>
      {subtitle && <p>{subtitle}</p>}
    </div>
    {actions && <div className="card-head-actions">{actions}</div>}
  </header>
);
