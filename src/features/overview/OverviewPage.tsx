import {useMemo, useState} from 'react';
import {ArrowDownLeft, ArrowUpRight, CreditCard, PieChart, Wallet} from 'lucide-react';
import {Card, CardHeader} from '../../components/ui/Card';
import {EmptyState} from '../../components/ui/EmptyState';
import {Segmented} from '../../components/ui/Segmented';
import {CashflowChart} from '../../components/charts/CashflowChart';
import {CategoryDonut} from '../../components/charts/CategoryDonut';
import {KpiCard} from './KpiCard';
import {UpcomingPayments} from './UpcomingPayments';
import {MonthSummary} from './MonthSummary';
import {OwnVsOthers} from './OwnVsOthers';
import {PlanningCard} from './PlanningCard';
import {CategoryAlerts} from '../categories/CategoryAlerts';
import {
  activeCategoryAlerts,
  aportesPorDia,
  categoryAlerts,
  categoryBreakdown,
  dailyFlow,
  metaProgress,
  reservaSaldo,
  splitExpenses,
  type FlowScope,
} from '../../lib/selectors';
import {monthLabel} from '../../lib/format';
import type {PageProps} from '../../app/pageProps';

export const OverviewPage = ({dashboard, state, ledger, overview, onNavigate}: PageProps) => {
  const [scope, setScope] = useState<FlowScope>('proprio');

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

  const alertas = useMemo(() => categoryAlerts(dashboard), [dashboard]);
  const alertasAtivos = useMemo(() => activeCategoryAlerts(alertas), [alertas]);
  const flow = useMemo(() => dailyFlow(dashboard, {scope, aportes}), [dashboard, scope, aportes]);

  const despesasDoEscopo = scope === 'proprio' ? splitExpenses(state.expenses).proprias : state.expenses;
  const slices = useMemo(
    () => categoryBreakdown(despesasDoEscopo, dashboard.categoria_despesas),
    [despesasDoEscopo, dashboard.categoria_despesas],
  );
  const totalCategorias = despesasDoEscopo.reduce((acc, item) => acc + item.valor, 0);

  const metas = useMemo(
    () => metaProgress(ledger.metas, ledger.metaMovimentos, state.mesId),
    [ledger.metas, ledger.metaMovimentos, state.mesId],
  );
  const saldoReserva = useMemo(() => reservaSaldo(ledger.reservaMovimentos), [ledger.reservaMovimentos]);

  return (
    <div className="enter page-stack">
      <div className="grid grid-kpi">
        <KpiCard
          label="Saldo disponível"
          value={overview.saldoDisponivel}
          footnote="Suas entradas menos o que já pagou e guardou"
          icon={Wallet}
          tone={overview.saldoDisponivel >= 0 ? 'good' : 'bad'}
        />
        <KpiCard
          label="Entradas suas"
          value={overview.entradasProprias}
          footnote={overview.reembolsos > 0 ? 'Sem contar devoluções de terceiros' : 'Ganhos fixos e variáveis'}
          icon={ArrowDownLeft}
          tone="info"
        />
        <KpiCard
          label="Saídas suas"
          value={overview.proprias.paid}
          footnote="Despesas suas já pagas"
          icon={ArrowUpRight}
          tone="bad"
        />
        <KpiCard
          label="A pagar"
          value={overview.proprias.toPay}
          footnote={`${overview.proprias.toPayCount} despesa(s) suas em aberto`}
          icon={CreditCard}
          tone="warn"
        />
      </div>

      {alertasAtivos.length > 0 && (
        <CategoryAlerts
          alerts={alertasAtivos}
          configurados={alertas.length}
          onManage={() => onNavigate('categories')}
        />
      )}

      <div className="grid grid-main">
        <Card>
          <CardHeader
            title="Fluxo de caixa"
            subtitle={monthLabel(state.mesId)}
            actions={
              <div style={{minWidth: 220}}>
                <Segmented
                  ariaLabel="Escopo do fluxo"
                  value={scope}
                  onChange={setScope}
                  options={[
                    {value: 'proprio', label: 'Só o meu'},
                    {value: 'tudo', label: 'Tudo na conta'},
                  ]}
                />
              </div>
            }
          />
          <div className="card-body">
            <CashflowChart flow={flow} mesLabel={monthLabel(state.mesId)} />
            <p className="text-muted" style={{fontSize: 12.5, marginTop: 12}}>
              {scope === 'proprio'
                ? 'Sem os gastos de terceiros e sem as devoluções. Os aportes em metas e reserva aparecem como saída.'
                : 'Todo o dinheiro que passa pela conta, inclusive o que você adiantou para outras pessoas.'}
            </p>
          </div>
        </Card>

        <UpcomingPayments
          expenses={state.expenses}
          pessoas={ledger.pessoas}
          onSeeAll={() => onNavigate('expenses')}
        />
      </div>

      <div className="grid grid-split">
        <OwnVsOthers overview={overview} onOpenPeople={() => onNavigate('people')} />
        <PlanningCard
          metas={metas}
          reservaSaldo={saldoReserva}
          reservaObjetivo={ledger.reserva?.objetivo || 0}
          aportesMes={overview.aportesMes}
          onOpenGoals={() => onNavigate('goals')}
          onOpenReserve={() => onNavigate('reserve')}
        />
      </div>

      <div className="grid grid-split">
        <Card>
          <CardHeader
            title="Gastos por categoria"
            subtitle={scope === 'proprio' ? 'Só as suas despesas' : 'Todas as despesas do mês'}
          />
          <div className="card-body">
            {slices.length === 0 ? (
              <EmptyState
                icon={<PieChart size={22} />}
                title="Sem gastos para distribuir"
                description="Assim que houver despesas no mês, a distribuição por categoria aparece aqui."
              />
            ) : (
              <CategoryDonut slices={slices} total={totalCategorias} />
            )}
          </div>
        </Card>

        <MonthSummary overview={overview} mesId={state.mesId} />
      </div>
    </div>
  );
};
