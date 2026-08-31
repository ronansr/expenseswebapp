import {useMemo, useState} from 'react';
import {BarChart3, CalendarClock, PartyPopper, TrendingDown} from 'lucide-react';
import {Card, CardHeader} from '../../components/ui/Card';
import {EmptyState} from '../../components/ui/EmptyState';
import {RowsSkeleton} from '../../components/ui/Skeleton';
import {Segmented} from '../../components/ui/Segmented';
import {CategoryDonut} from '../../components/charts/CategoryDonut';
import {KpiCard} from '../overview/KpiCard';
import {useForecast, HORIZONTE_FUTURO} from './useForecast';
import {categoryBreakdown} from '../../lib/selectors';
import {money, monthLabel, monthShort} from '../../lib/format';
import type {PageProps} from '../../app/pageProps';

type Janela = 'historico' | 'futuro' | 'tudo';

export const ReportsPage = ({dashboard, state}: PageProps) => {
  const [janela, setJanela] = useState<Janela>('tudo');
  const {serie, marcos, resumo, loading, error} = useForecast(state.mesId);
  const slices = categoryBreakdown(state.expenses, dashboard.categoria_despesas);

  const visivel = useMemo(() => {
    if (janela === 'historico') return serie.filter(item => !item.futuro);
    if (janela === 'futuro') return serie.filter(item => item.futuro);
    return serie;
  }, [serie, janela]);

  const peak = Math.max(...visivel.flatMap(item => [item.entradas, item.saidas]), 1);
  const mediaSaidas = visivel.length
    ? visivel.reduce((acc, item) => acc + item.saidas, 0) / visivel.length
    : 0;

  const alivio = resumo?.primeiroAlivio || null;

  return (
    <div className="enter page-stack">
      {error && <p className="banner" role="alert">{error}</p>}

      <div className="grid grid-kpi">
        <KpiCard
          label="Já comprometido por mês"
          value={resumo?.comprometidoMedio || 0}
          footnote={`Média dos próximos ${HORIZONTE_FUTURO} meses`}
          icon={CalendarClock}
          tone="warn"
        />
        <KpiCard
          label="Parcelas ainda a vencer"
          value={resumo?.parcelasAVencer || 0}
          footnote="Soma de tudo que já foi parcelado"
          icon={BarChart3}
        />
        <KpiCard
          label="Mês mais pesado"
          value={resumo?.mesMaisPesado?.saidas || 0}
          footnote={
            resumo?.mesMaisPesado
              ? monthLabel(resumo.mesMaisPesado.mesId)
              : 'Nada comprometido à frente'
          }
          icon={TrendingDown}
          tone="bad"
        />
        <KpiCard
          label="Alívio de"
          value={alivio?.queda || 0}
          footnote={alivio ? `A partir de ${monthLabel(alivio.mesId)}` : 'Sem queda prevista no horizonte'}
          icon={PartyPopper}
          tone="good"
        />
      </div>

      {alivio && (
        <p className="banner banner-good" role="status">
          A sua conta cai {money(alivio.queda)} em {monthLabel(alivio.mesId)}, quando o comprometido passa a
          ser {money(alivio.depois)} por mês.
          {alivio.causas.length > 0 &&
            ` O que sai da conta: ${alivio.causas.map(causa => causa.descricao).join(', ')}.`}
        </p>
      )}

      <Card>
        <CardHeader
          title="Entradas e saídas, mês a mês"
          subtitle={
            visivel.length
              ? `Média de saídas: ${money(mediaSaidas)}. O futuro mostra só o que já está contratado.`
              : 'Últimos meses registrados'
          }
          actions={
            <div className="segmented-slot">
              <Segmented
                ariaLabel="Janela do relatório"
                value={janela}
                onChange={setJanela}
                options={[
                  {value: 'historico', label: 'Passado'},
                  {value: 'tudo', label: 'Tudo'},
                  {value: 'futuro', label: 'Futuro'},
                ]}
              />
            </div>
          }
        />
        <div className="card-body">
          {loading ? (
            <RowsSkeleton rows={6} />
          ) : visivel.length === 0 ? (
            <EmptyState
              icon={<BarChart3 size={22} />}
              title="Ainda sem histórico"
              description="O relatório compara os meses já registrados e projeta os próximos. Volte depois de lançar as primeiras contas."
            />
          ) : (
            <>
              <div className="report-bars">
                {visivel.map(item => (
                  <div
                    className={`report-bar ${item.futuro ? 'is-forecast' : ''} ${item.mesId === state.mesId ? 'is-current' : ''}`.trim()}
                    key={item.mesId}>
                    <span className="report-bar-label">
                      {monthShort(item.mesId)}
                      {item.futuro && <small>previsto</small>}
                    </span>
                    <span className="report-bar-track">
                      <i
                        className="report-bar-in"
                        style={{width: `${(item.entradas / peak) * 100}%`}}
                        title={`Entradas ${money(item.entradas)}`}
                      />
                      <i
                        className="report-bar-out"
                        style={{width: `${(item.saidas / peak) * 100}%`}}
                        title={`Saídas ${money(item.saidas)}`}
                      />
                    </span>
                    <b className={item.saldo >= 0 ? 'text-good' : 'text-bad'}>{money(item.saldo)}</b>
                  </div>
                ))}
              </div>

              <div className="viz-legend" style={{marginTop: 16}}>
                <span className="viz-legend-item">
                  <i className="viz-swatch-dot" style={{background: 'var(--series-in)'}} /> Entradas
                </span>
                <span className="viz-legend-item">
                  <i className="viz-swatch-dot" style={{background: 'var(--series-out)'}} /> Saídas
                </span>
                <span className="viz-legend-item">
                  <i className="viz-swatch-hatch" aria-hidden="true" /> Barra vazada: mês previsto
                </span>
                <span className="viz-legend-item">Valor à direita: saldo do mês</span>
              </div>

              {janela !== 'historico' && (
                <p className="text-muted" style={{fontSize: 12.5, marginTop: 12}}>
                  O mês futuro conta só o que já está contratado: parcela que ainda vai vencer e conta fixa que
                  se repete. Gasto avulso não entra, então o real tende a ficar acima da barra.
                </p>
              )}
            </>
          )}
        </div>
      </Card>

      <div className="grid grid-split">
        <Card>
          <CardHeader
            title="Quando a conta começa a cair"
            subtitle="Cada marco é um parcelamento que termina e libera o valor do mês seguinte."
          />
          <div className="card-list">
            {loading ? (
              <RowsSkeleton rows={3} />
            ) : marcos.length === 0 ? (
              <EmptyState
                icon={<CalendarClock size={22} />}
                title="Nenhuma queda prevista"
                description="No horizonte projetado, o comprometido não diminui. Ele cai quando um parcelamento chega na última parcela."
              />
            ) : (
              <div className="rows">
                {marcos.map(marco => (
                  <div className="row-item" key={marco.mesId}>
                    <span className="row-icon tone-good" aria-hidden="true">
                      <TrendingDown size={16} />
                    </span>
                    <div className="row-main">
                      <span className="row-title">{monthLabel(marco.mesId)}</span>
                      <span className="row-meta">
                        Passa a comprometer {money(marco.depois)} por mês
                        {marco.causas.slice(0, 2).map(causa => (
                          <span className="pill" key={causa.descricao}>{causa.descricao} acaba</span>
                        ))}
                        {marco.causas.length > 2 && (
                          <span className="pill">mais {marco.causas.length - 2}</span>
                        )}
                      </span>
                    </div>
                    <strong className="row-value text-good">-{money(marco.queda)}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Distribuição do mês atual" subtitle="Participação de cada categoria nas saídas" />
          <div className="card-body">
            {slices.length === 0 ? (
              <EmptyState
                icon={<BarChart3 size={22} />}
                title="Sem dados"
                description="Nenhuma despesa registrada neste mês."
              />
            ) : (
              <CategoryDonut slices={slices} total={state.totals.total} />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
