import {useMemo, useState} from 'react';
import {ArrowDownLeft, CalendarDays, TrendingUp} from 'lucide-react';
import {Card, CardHeader} from '../../components/ui/Card';
import {EmptyState} from '../../components/ui/EmptyState';
import {Segmented} from '../../components/ui/Segmented';
import {ExpenseRow} from '../expenses/ExpenseRow';
import {
  activeGains,
  aportesPorDia,
  calendarCells,
  dailyFlow,
  isReimbursement,
} from '../../lib/selectors';
import {
  compactMoney,
  dayLabel,
  firstWeekdayOffset,
  isSameDayAsToday,
  money,
  toInputDate,
} from '../../lib/format';
import type {PageProps} from '../../app/pageProps';

const DOW = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];

type Modo = 'vencimentos' | 'fluxo';

export const CalendarPage = ({
  dashboard,
  state,
  ledger,
  onEditExpense,
  onDeleteExpense,
  onNewExpense,
}: PageProps) => {
  const [modo, setModo] = useState<Modo>('vencimentos');
  const [selected, setSelected] = useState<string | null>(null);

  const aportes = useMemo(
    () =>
      aportesPorDia(
        ledger.metaMovimentos,
        ledger.reservaMovimentos,
        state.mesId,
        ledger.investimentoMovimentos,
      ),
    [ledger.metaMovimentos, ledger.reservaMovimentos, ledger.investimentoMovimentos, state.mesId],
  );

  /* No modo fluxo o dia mostra o dinheiro inteiro, não só o vencimento da conta. */
  const opcoes = useMemo(
    () => (modo === 'fluxo' ? {scope: 'proprio' as const, aportes} : {}),
    [modo, aportes],
  );

  const cells = useMemo(
    () => calendarCells(dashboard, firstWeekdayOffset(state.mesId), opcoes),
    [dashboard, state.mesId, opcoes],
  );

  const flow = useMemo(() => dailyFlow(dashboard, opcoes), [dashboard, opcoes]);
  const saldoPorDia = useMemo(
    () => new Map(flow.map(item => [item.day, item.saldo])),
    [flow],
  );
  const piorSaldo = flow.reduce(
    (pior, item) => (item.saldo < pior.saldo ? item : pior),
    flow[0] || {day: 1, saldo: 0, entradas: 0, saidas: 0},
  );

  const ganhosDoMes = useMemo(
    () => activeGains(dashboard.mes_info.ganhos_mes),
    [dashboard.mes_info.ganhos_mes],
  );

  const diaSelecionado = selected ? Number(selected.slice(8, 10)) : null;
  const dayExpenses = selected
    ? state.expenses.filter(item => toInputDate(item.vencimento) === selected)
    : [];
  const dayGains =
    diaSelecionado === null
      ? []
      : ganhosDoMes.filter(item => (item.dia_entrada || 1) === diaSelecionado);

  const totalSaidasDoDia = dayExpenses.reduce((acc, item) => acc + item.valor, 0);
  const totalEntradasDoDia = dayGains.reduce((acc, item) => acc + (item.valor || 0), 0);

  return (
    <div className="enter page-stack">
      <Card>
        <CardHeader
          title="Calendário do mês"
          subtitle={
            modo === 'fluxo'
              ? 'Entrada, saída e o saldo que sobra ao fim de cada dia.'
              : 'Toque em um dia para ver os lançamentos que vencem nele.'
          }
          actions={
            <div className="segmented-slot">
              <Segmented
                ariaLabel="Modo de visualização do calendário"
                value={modo}
                onChange={setModo}
                options={[
                  {value: 'vencimentos', label: 'Vencimentos'},
                  {value: 'fluxo', label: 'Fluxo'},
                ]}
              />
            </div>
          }
        />
        <div className="card-body">
          <div className={`cal-grid ${modo === 'fluxo' ? 'is-flow' : ''}`.trim()} role="grid">
            {DOW.map(day => (
              <div className="cal-dow" key={day}>{day}</div>
            ))}
            {cells.map(cell => {
              if (cell.day === null) {
                return <div className="cal-day is-outside" key={cell.key} aria-hidden="true" />;
              }
              const saldo = saldoPorDia.get(cell.day) ?? 0;
              return (
                <button
                  type="button"
                  key={cell.key}
                  className={[
                    'cal-day',
                    isSameDayAsToday(cell.dateInput) ? 'is-today' : '',
                    selected === cell.dateInput ? 'is-selected' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => setSelected(current => (current === cell.dateInput ? null : cell.dateInput))}
                  aria-pressed={selected === cell.dateInput}>
                  <span className="cal-num">{cell.day}</span>
                  {cell.entradas > 0 && <span className="cal-in">+{compactMoney(cell.entradas)}</span>}
                  {cell.saidas > 0 && <span className="cal-out">-{compactMoney(cell.saidas)}</span>}
                  {modo === 'fluxo' && (
                    <span className={`cal-balance ${saldo < 0 ? 'is-negative' : ''}`.trim()}>
                      {compactMoney(saldo)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="viz-legend" style={{marginTop: 16}}>
            <span className="viz-legend-item">
              <i className="viz-swatch-bar" style={{background: 'var(--good-600)'}} /> Entradas do dia
            </span>
            <span className="viz-legend-item">
              <i className="viz-swatch-bar" style={{background: 'var(--bad-600)'}} /> Saídas do dia
            </span>
            {modo === 'fluxo' && (
              <span className="viz-legend-item">Valor de baixo: saldo acumulado até o fim do dia</span>
            )}
          </div>

          {modo === 'fluxo' && piorSaldo.saldo < 0 && (
            <p className="banner" role="status" style={{marginTop: 16}}>
              O saldo fica negativo a partir do dia {piorSaldo.day}, chegando a {money(piorSaldo.saldo)}.
              Antecipar uma entrada ou adiar uma conta desse período resolve o buraco.
            </p>
          )}
          {modo === 'fluxo' && piorSaldo.saldo >= 0 && flow.length > 0 && (
            <p className="text-muted" style={{marginTop: 16, fontSize: 12.5}}>
              O saldo não fica negativo em nenhum dia do mês. O ponto mais apertado é o dia {piorSaldo.day},
              com {money(piorSaldo.saldo)}.
            </p>
          )}
        </div>
      </Card>

      {selected && (
        <Card>
          <CardHeader
            title={dayLabel(selected)}
            subtitle={
              modo === 'fluxo'
                ? `${money(totalEntradasDoDia)} de entrada, ${money(totalSaidasDoDia)} de saída`
                : `${dayExpenses.length} despesa(s), ${money(totalSaidasDoDia)}`
            }
          />

          {modo === 'fluxo' && dayGains.length > 0 && (
            <div className="rows">
              {dayGains.map(gain => (
                <div className="row-item" key={gain.id}>
                  <span
                    className={`row-icon ${isReimbursement(gain) ? 'tone-info' : 'tone-good'}`}
                    aria-hidden="true">
                    {isReimbursement(gain) ? <ArrowDownLeft size={16} /> : <TrendingUp size={16} />}
                  </span>
                  <div className="row-main">
                    <span className="row-title">{gain.descricao || 'Entrada'}</span>
                    <span className="row-meta">
                      {isReimbursement(gain) ? 'Devolução de terceiro' : 'Receita sua'}
                    </span>
                  </div>
                  <strong className="row-value text-good">+{money(gain.valor || 0)}</strong>
                </div>
              ))}
            </div>
          )}

          <div className="card-list">
            {dayExpenses.length === 0 ? (
              <EmptyState
                icon={<CalendarDays size={22} />}
                title="Sem despesas neste dia"
                description="Nenhum lançamento vence nesta data."
                action={<button type="button" className="btn btn-ghost" onClick={onNewExpense}>Nova despesa</button>}
              />
            ) : (
              dayExpenses.map(expense => (
                <ExpenseRow
                  key={expense.id}
                  expense={expense}
                  categorias={dashboard.categoria_despesas}
                  pessoas={ledger.pessoas}
                  onEdit={onEditExpense}
                  onDelete={onDeleteExpense}
                  onChanged={state.reload}
                />
              ))
            )}
          </div>
        </Card>
      )}
    </div>
  );
};
