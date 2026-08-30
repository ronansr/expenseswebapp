import {Card, CardHeader} from '../../components/ui/Card';
import {money, monthLabel} from '../../lib/format';
import type {MonthOverview} from '../../lib/selectors';

type Props = {
  overview: MonthOverview;
  mesId: string;
};

export const MonthSummary = ({overview, mesId}: Props) => (
  <Card>
    <CardHeader title="Resumo mensal" subtitle={monthLabel(mesId)} />
    <div className="card-body">
      <div className="summary-rows">
        <div className="summary-row">
          <span>Entradas suas</span>
          <b className="text-good">{money(overview.entradasProprias)}</b>
        </div>
        <div className="summary-row">
          <span>Saídas suas</span>
          <b className="text-bad">{money(overview.proprias.total)}</b>
        </div>
        <div className="summary-row">
          <span>Guardado em metas e reserva</span>
          <b>{money(overview.aportesMes)}</b>
        </div>
        <div className="summary-row">
          <span>A pagar</span>
          <b className="text-warn">{money(overview.proprias.toPay)}</b>
        </div>
        {overview.terceiros.total > 0 && (
          <div className="summary-row">
            <span>Adiantado para terceiros</span>
            <b>{money(overview.terceiros.total)}</b>
          </div>
        )}
      </div>
      <div className={`summary-total ${overview.saldoProjetado < 0 ? 'is-negative' : ''}`.trim()}>
        <span>Saldo projetado</span>
        <b>{money(overview.saldoProjetado)}</b>
      </div>
      {overview.reservaSaldo > 0 && (
        <p className="text-muted" style={{marginTop: 12, fontSize: 12.5}}>
          Com a reserva de emergência, você chega a {money(overview.saldoComReserva)}.
        </p>
      )}
    </div>
  </Card>
);
