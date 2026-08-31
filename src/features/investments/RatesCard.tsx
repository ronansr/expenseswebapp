import {RefreshCw} from 'lucide-react';
import {Card, CardHeader} from '../../components/ui/Card';
import type {MarketRates} from '../../types';
import {shortDate} from '../../lib/format';

type Props = {
  rates: MarketRates;
  loading: boolean;
  onRefresh: () => void;
};

const percent = (value: number, casas = 2) => `${value.toFixed(casas).replace('.', ',')}%`;

/**
 * As taxas que alimentam o cálculo, vindas das séries do Banco Central. O rótulo
 * de origem é obrigatório: uma taxa estimada não pode parecer um extrato.
 */
export const RatesCard = ({rates, loading, onRefresh}: Props) => {
  const linhas = [
    {label: 'CDI', valor: percent(rates.cdi), nota: 'ao ano'},
    {label: 'Selic', valor: percent(rates.selic), nota: 'meta do Copom'},
    {label: 'Poupança', valor: percent(rates.poupancaMensal, 4), nota: 'ao mês'},
    {label: 'IPCA', valor: percent(rates.ipca), nota: 'doze meses'},
  ];

  return (
    <Card>
      <CardHeader
        title="Taxas de referência"
        subtitle={
          rates.aoVivo
            ? `Séries do Banco Central, lidas em ${shortDate(rates.atualizadoEm)}.`
            : 'O Banco Central não respondeu. Os números abaixo são o último patamar conhecido.'
        }
        actions={
          <button
            type="button"
            className="icon-btn"
            onClick={onRefresh}
            disabled={loading}
            aria-label="Atualizar taxas">
            <RefreshCw size={16} className={loading ? 'spin' : undefined} />
          </button>
        }
      />
      <div className="card-body">
        <div className="rate-grid">
          {linhas.map(linha => (
            <div className="rate-cell" key={linha.label}>
              <span className="rate-label">{linha.label}</span>
              <strong className="rate-value num">{linha.valor}</strong>
              <span className="rate-note">{linha.nota}</span>
            </div>
          ))}
        </div>
        {!rates.aoVivo && (
          <p className="banner banner-warn" role="status" style={{marginTop: 16}}>
            Rendimento calculado com taxa estimada. Toque em atualizar quando voltar a ter conexão.
          </p>
        )}
      </div>
    </Card>
  );
};
