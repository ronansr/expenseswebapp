import {CalendarCheck, CircleAlert} from 'lucide-react';
import {Card, CardHeader} from '../../components/ui/Card';
import {EmptyState} from '../../components/ui/EmptyState';
import {upcomingPayments, STATUS_LATE} from '../../lib/selectors';
import {isSameDayAsToday, money, shortDayMonth, toInputDate} from '../../lib/format';
import type {Despesa, Pessoa} from '../../types';

const LIMIT = 5;

const dueLabel = (expense: Despesa) => {
  const due = toInputDate(expense.vencimento);
  if (isSameDayAsToday(due)) return 'Hoje';
  if (expense.status === STATUS_LATE) return `Atrasada, ${shortDayMonth(expense.vencimento)}`;
  return shortDayMonth(expense.vencimento);
};

type Props = {
  expenses: Despesa[];
  pessoas: Pessoa[];
  onSeeAll: () => void;
};

export const UpcomingPayments = ({expenses, pessoas, onSeeAll}: Props) => {
  const pending = upcomingPayments(expenses);
  const visible = pending.slice(0, LIMIT);

  return (
    <Card>
      <CardHeader
        title="Próximos pagamentos"
        subtitle={`${pending.length} em aberto, incluindo o que você adiantou por outras pessoas`}
      />
      {visible.length === 0 ? (
        <EmptyState
          icon={<CalendarCheck size={22} />}
          title="Tudo pago"
          description="Nenhuma conta em aberto neste mês."
        />
      ) : (
        <>
          <div className="rows" style={{marginTop: 12}}>
            {visible.map(expense => (
              <div className="row-item" key={expense.id}>
                <span className={`row-icon ${expense.status === STATUS_LATE ? 'tone-bad' : ''}`.trim()} aria-hidden="true">
                  {expense.status === STATUS_LATE ? <CircleAlert size={16} /> : <CalendarCheck size={16} />}
                </span>
                <div className="row-main">
                  <span className="row-title">{expense.descricao}</span>
                  <span className={`row-meta ${expense.status === STATUS_LATE ? 'text-bad' : ''}`.trim()}>
                    {dueLabel(expense)}
                    {expense.totalParcelas > 1 && <span className="pill pill-info">{expense.parcela}/{expense.totalParcelas}</span>}
                    {expense.pessoa_id && (
                      <span className="pill pill-info">
                        de {pessoas.find(item => item.id === expense.pessoa_id)?.nome || 'terceiro'}
                      </span>
                    )}
                  </span>
                </div>
                <strong className="row-value">{money(expense.valor)}</strong>
              </div>
            ))}
          </div>
          {pending.length > LIMIT && (
            <div className="card-foot">
              <button type="button" className="link-btn" onClick={onSeeAll}>
                Ver todas ({pending.length})
              </button>
            </div>
          )}
        </>
      )}
    </Card>
  );
};
