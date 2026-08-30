import {ArrowRight, Users} from 'lucide-react';
import {Card, CardHeader} from '../../components/ui/Card';
import {money} from '../../lib/format';
import type {MonthOverview} from '../../lib/selectors';

type Props = {
  overview: MonthOverview;
  onOpenPeople: () => void;
};

/**
 * O card que responde à pergunta central: destes gastos todos, quanto é meu?
 * A barra compara as duas fatias na mesma escala.
 */
export const OwnVsOthers = ({overview, onOpenPeople}: Props) => {
  const meu = overview.proprias.total;
  const deTerceiros = overview.terceiros.total;
  const somaTudo = meu + deTerceiros;
  const fatiaMinha = somaTudo > 0 ? meu / somaTudo : 1;

  return (
    <Card>
      <CardHeader
        title="Meu e dos outros"
        subtitle="Tudo o que saiu do seu cartão, separado por dono."
        actions={
          <button type="button" className="link-btn" onClick={onOpenPeople}>
            Ver pessoas <ArrowRight size={13} style={{verticalAlign: -2}} />
          </button>
        }
      />
      <div className="card-body">
        <div className="split-bar" role="img" aria-label={`${Math.round(fatiaMinha * 100)}% dos gastos são seus`}>
          <i className="split-bar-own" style={{flexGrow: Math.max(fatiaMinha, 0.02)}} />
          <i className="split-bar-other" style={{flexGrow: Math.max(1 - fatiaMinha, 0.02)}} />
        </div>

        <div className="summary-rows" style={{marginTop: 16}}>
          <div className="summary-row">
            <span><i className="split-dot split-dot-own" aria-hidden="true" /> Gastos seus</span>
            <b>{money(meu)}</b>
          </div>
          <div className="summary-row">
            <span><i className="split-dot split-dot-other" aria-hidden="true" /> Gastos de terceiros</span>
            <b>{money(deTerceiros)}</b>
          </div>
          <div className="summary-row">
            <span>Devoluções recebidas</span>
            <b className="text-good">{money(overview.reembolsos)}</b>
          </div>
        </div>

        {deTerceiros > 0 || overview.aReceber !== 0 ? (
          <div className={`summary-total ${overview.aReceber > 0 ? 'is-warning' : ''}`.trim()}>
            <span><Users size={15} style={{verticalAlign: -3, marginRight: 6}} />A receber</span>
            <b>{money(overview.aReceber)}</b>
          </div>
        ) : (
          <p className="text-muted" style={{marginTop: 16, fontSize: 13}}>
            Neste mês tudo o que saiu foi seu. Ao lançar uma despesa que você pagou por outra pessoa, escolha o
            nome dela no formulário.
          </p>
        )}
      </div>
    </Card>
  );
};
