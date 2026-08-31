import {useMemo} from 'react';
import {Layers, Pencil, Trash2} from 'lucide-react';
import {Card, CardHeader} from '../../components/ui/Card';
import {EmptyState} from '../../components/ui/EmptyState';
import {installmentGroups} from '../../lib/selectors';
import {money, shortDate} from '../../lib/format';
import type {PageProps} from '../../app/pageProps';

export const InstallmentsPage = ({dashboard, onNewExpense, onEditExpense, onDeleteExpense}: PageProps) => {
  const groups = useMemo(() => installmentGroups(dashboard), [dashboard]);
  const total = groups.reduce((acc, item) => acc + item.valor, 0);

  return (
    <div className="enter">
      <Card>
        <CardHeader
          title="Compras parceladas"
          subtitle={`${groups.length} em andamento, ${money(total)} neste mês`}
          actions={<button type="button" className="btn btn-primary btn-sm" onClick={onNewExpense}>Novo parcelamento</button>}
        />
        <div className="card-list">
          {groups.length === 0 ? (
            <EmptyState
              icon={<Layers size={22} />}
              title="Nenhuma parcela ativa"
              description="Lançamentos com mais de uma parcela aparecem aqui com o andamento de cada compra."
              action={<button type="button" className="btn btn-ghost" onClick={onNewExpense}>Criar parcelamento</button>}
            />
          ) : (
            <div className="rows">
              {groups.map(group => (
                <div className="row-item" key={group.id}>
                  <span className="row-icon" aria-hidden="true"><Layers size={16} /></span>
                  <div className="row-main">
                    <span className="row-title">{group.descricao}</span>
                    <span className="row-meta">
                      Parcela {group.parcela} de {group.totalParcelas}, vence {shortDate(group.vencimento)}
                    </span>
                    <span className="progress" aria-hidden="true">
                      <i style={{transform: `scaleX(${group.parcela / group.totalParcelas})`}} />
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
