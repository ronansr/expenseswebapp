import {useState} from 'react';
import {MoreHorizontal, Plus} from 'lucide-react';
import {NAV_GROUPS, TAB_ITEMS, type NavEntry, type ViewId} from '../../app/navigation';
import {Modal} from '../ui/Modal';

type Props = {
  view: ViewId;
  onNavigate: (view: ViewId) => void;
  onNewExpense: () => void;
};

export const MobileTabBar = ({view, onNavigate, onNewExpense}: Props) => {
  const [menuAberto, setMenuAberto] = useState(false);
  const [inicio, calendário, despesas] = TAB_ITEMS;

  const renderTab = (item: NavEntry) => (
    <button
      key={item.id}
      type="button"
      className="tab"
      aria-current={view === item.id ? 'page' : undefined}
      onClick={() => onNavigate(item.id)}>
      <item.icon size={20} strokeWidth={1.8} />
      {item.label}
    </button>
  );

  const irPara = (id: ViewId) => {
    onNavigate(id);
    setMenuAberto(false);
  };

  const emOutraSecao = !TAB_ITEMS.some(item => item.id === view);

  return (
    <>
      <nav className="tabbar" aria-label="Navegação">
        {renderTab(inicio)}
        {renderTab(calendário)}
        <button type="button" className="tab-fab" onClick={onNewExpense} aria-label="Nova despesa">
          <Plus size={22} />
        </button>
        {renderTab(despesas)}
        <button
          type="button"
          className="tab"
          aria-current={emOutraSecao ? 'page' : undefined}
          onClick={() => setMenuAberto(true)}>
          <MoreHorizontal size={20} strokeWidth={1.8} />
          Mais
        </button>
      </nav>

      {menuAberto && (
        <Modal title="Ir para" onClose={() => setMenuAberto(false)}>
          {NAV_GROUPS.map(group => (
            <div key={group.label}>
              <p className="nav-group-label">{group.label}</p>
              <div className="nav">
                {group.items.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    className="nav-item"
                    aria-current={view === item.id ? 'page' : undefined}
                    onClick={() => irPara(item.id)}>
                    <item.icon size={17} strokeWidth={1.8} />
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </Modal>
      )}
    </>
  );
};
