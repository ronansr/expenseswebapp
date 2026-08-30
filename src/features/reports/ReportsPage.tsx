import {BarChart3} from 'lucide-react';
import {Card, CardHeader} from '../../components/ui/Card';
import {EmptyState} from '../../components/ui/EmptyState';
import {RowsSkeleton} from '../../components/ui/Skeleton';
import {CategoryDonut} from '../../components/charts/CategoryDonut';
import {useMonthlyReport} from './useMonthlyReport';
import {categoryBreakdown} from '../../lib/selectors';
import {money, monthShort} from '../../lib/format';
import type {PageProps} from '../../app/pageProps';

export const ReportsPage = ({dashboard, state}: PageProps) => {
  const {data, loading, error} = useMonthlyReport(state.mesId);
  const slices = categoryBreakdown(state.expenses, dashboard.categoria_despesas);
  const peak = Math.max(...data.flatMap(item => [item.entradas, item.saidas]), 1);
  const mediaSaidas = data.length ? data.reduce((acc, item) => acc + item.saidas, 0) / data.length : 0;

  return (
    <div className="enter" style={{display: 'flex', flexDirection: 'column', gap: 16}}>
      {error && <p className="banner" role="alert">{error}</p>}

      <Card>
        <CardHeader
          title="Entradas e saídas por mês"
          subtitle={data.length ? `Média de saídas: ${money(mediaSaidas)}` : 'Últimos meses registrados'}
        />
        <div className="card-body">
          {loading ? (
            <RowsSkeleton rows={4} />
          ) : data.length === 0 ? (
            <EmptyState
              icon={<BarChart3 size={22} />}
              title="Ainda sem histórico"
              description="O relatório compara os meses já registrados. Volte depois de fechar o primeiro mês."
            />
          ) : (
            <>
              <div className="report-bars">
                {data.map(item => (
                  <div className="report-bar" key={item.mesId}>
                    <span className="text-muted">{monthShort(item.mesId)}</span>
                    <span className="report-bar-track">
                      <i className="report-bar-in" style={{width: `${(item.entradas / peak) * 100}%`}} title={`Entradas ${money(item.entradas)}`} />
                      <i className="report-bar-out" style={{width: `${(item.saidas / peak) * 100}%`}} title={`Saídas ${money(item.saidas)}`} />
                    </span>
                    <b className={item.saldo >= 0 ? 'text-good' : 'text-bad'}>{money(item.saldo)}</b>
                  </div>
                ))}
              </div>
              <div className="viz-legend" style={{marginTop: 16}}>
                <span className="viz-legend-item"><i className="viz-swatch-dot" style={{background: 'var(--series-in)'}} /> Entradas</span>
                <span className="viz-legend-item"><i className="viz-swatch-dot" style={{background: 'var(--series-out)'}} /> Saídas</span>
                <span className="viz-legend-item">Valor a direita: saldo do mês</span>
              </div>
            </>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="Distribuição do mês atual" subtitle="Participação de cada categoria nas saídas" />
        <div className="card-body">
          {slices.length === 0 ? (
            <EmptyState icon={<BarChart3 size={22} />} title="Sem dados" description="Nenhuma despesa registrada neste mês." />
          ) : (
            <CategoryDonut slices={slices} total={state.totals.total} />
          )}
        </div>
      </Card>
    </div>
  );
};
