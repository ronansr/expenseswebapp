import {Wallet} from 'lucide-react';
import {NAV_GROUPS, type ViewId} from '../../app/navigation';
import {money} from '../../lib/format';

type Props = {
  view: ViewId;
  onNavigate: (view: ViewId) => void;
  toPay: number;
};

export const Sidebar = ({view, onNavigate, toPay}: Props) => (
  <aside className="sidebar">
    <div className="brand">
      <span className="brand-mark" aria-hidden="true"><Wallet size={19} /></span>
      <span className="brand-name">SobControle</span>
    </div>

    <nav className="nav" aria-label="Navegação principal">
      {NAV_GROUPS.map(group => (
        <div className="nav-group" key={group.label}>
          <p className="nav-group-label">{group.label}</p>
          {group.items.map(item => (
            <button
              key={item.id}
              type="button"
              className="nav-item"
              aria-current={view === item.id ? 'page' : undefined}
              onClick={() => onNavigate(item.id)}>
              <item.icon size={17} strokeWidth={1.8} />
              {item.label}
            </button>
          ))}
        </div>
      ))}
    </nav>

    <div className="sidebar-foot">
      <div className="hint-card">
        <h3>Falta pagar</h3>
        <strong className="hint-value money">{money(toPay)}</strong>
        <p>Suas contas em aberto até o fim do mês.</p>
      </div>
    </div>
  </aside>
);
