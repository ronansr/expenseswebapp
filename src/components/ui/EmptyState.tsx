import type {ReactNode} from 'react';

type EmptyStateProps = {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
};

export const EmptyState = ({icon, title, description, action}: EmptyStateProps) => (
  <div className="empty">
    <span className="empty-icon" aria-hidden="true">{icon}</span>
    <h3>{title}</h3>
    <p>{description}</p>
    {action}
  </div>
);
