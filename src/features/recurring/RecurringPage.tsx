import {useMemo} from 'react';
import {Pencil, Repeat, Trash2} from 'lucide-react';
import {Card, CardHeader} from '../../components/ui/Card';
import {EmptyState} from '../../components/ui/EmptyState';
import {recurringGroups} from '../../lib/selectors';
import {money, shortDate} from '../../lib/format';
import type {PageProps} from '../../app/pageProps';

export const RecurringPage = ({dashboard, onNewExpense, onEditExpense, onDeleteExpense}: PageProps) => {
  const groups = useMemo(() => recurringGroups(dashboard), [dashboard]);
  const categoryName = (id: string) =>
    dashboard.categoria_despesas.find(item => item.id === id)?.descricao || 'Sem categoria';
  const total = groups.reduce((acc, item) => acc + item.valor, 0);

  return (
    <div className="enter">
      <Card>
        <CardHeader
          title="Despesas recorrentes"
          subtitle={`${groups.length} ativa(s), ${money(total)} por mês`}
          actions={<button type="button" className="btn btn-primary btn-sm" onClick={onNewExpense}>Nova recorrente</button>}
        />
        <div style={{marginTop: 12}}>
          {groups.length === 0 ? (
            <EmptyState
              icon={<Repeat size={22} />}
              title="Nenhuma despesa fixa"
              description="Marque um lançamento como recorrente para ele se repetir automaticamente todo mês."
              action={<button type="button" className="btn btn-ghost" onClick={onNewExpense}>Criar recorrente</button>}
            />
          ) : (
            <div className="rows">
              {groups.map(group => (
                <div className="row-item" key={group.id}>
                  <span className="row-icon" aria-hidden="true"><Repeat size={16} /></span>
                  <div className="row-main">
                    <span className="row-title">{group.descricao}</span>
                    <span className="row-meta">
                      <span className="pill">{categoryName(group.categoriaId)}</span>
                      Próxima: {shortDate(group.proximoVencimento)}
                    </span>
                  </div>
                  <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                    <strong className="row-value">{money(group.valor)}</strong>
                    <button type="button" className="icon-btn" onClick={() => onEditExpense(group.sample)} aria-label={`Editar ${group.descricao}`}>
                      <Pencil size={16} />
                    </button>
                    <button type="button" className="icon-btn is-danger" onClick={() => onDeleteExpense(group.sample)} aria-label={`Excluir ${group.descricao}`}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
