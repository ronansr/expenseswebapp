import {useState, type FormEvent} from 'react';
import {ArrowDownLeft, HandCoins, Wallet} from 'lucide-react';
import {Card, CardHeader} from '../../components/ui/Card';
import {KpiCard} from '../overview/KpiCard';
import {IncomeEditor} from './IncomeEditor';
import {monthService} from '../../services';
import {activeGains, splitGains} from '../../lib/selectors';
import {money, monthLabel} from '../../lib/format';
import {errorMessage} from '../../lib/errors';
import type {ValorResumo} from '../../types';
import type {PageProps} from '../../app/pageProps';

const somar = (itens: ValorResumo[]) => itens.reduce((acc, item) => acc + (item.valor || 0), 0);

export const IncomePage = ({dashboard, state, ledger, overview}: PageProps) => {
  const [ganhos, setGanhos] = useState<ValorResumo[]>(activeGains(dashboard.mes_info.ganhos_mes));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const {proprias, reembolsos} = splitGains(ganhos);
  const totalProprias = somar(proprias);
  const totalReembolsos = somar(reembolsos);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await monthService.updateGanhosMes(dashboard.mes_info, ganhos);
      await state.reload();
      setSaved(true);
    } catch (err) {
      setError(errorMessage(err, 'Não foi possível salvar as entradas.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="enter page-stack" onSubmit={submit}>
      {error && <p className="banner" role="alert">{error}</p>}
      {saved && !error && (
        <p className="banner banner-info" role="status">Entradas salvas para {monthLabel(state.mesId)}.</p>
      )}

      <div className="grid grid-kpi">
        <KpiCard
          label="Minhas receitas"
          value={totalProprias}
          footnote={`${proprias.length} entrada(s) no seu saldo`}
          icon={Wallet}
          tone="good"
        />
        <KpiCard
          label="Devoluções de terceiros"
          value={totalReembolsos}
          footnote={`${reembolsos.length} devolução(ões), fora do seu saldo`}
          icon={HandCoins}
          tone="info"
        />
        <KpiCard
          label="Ainda a receber"
          value={overview.aReceber}
          footnote="Gastos de terceiros menos o que já voltou"
          icon={ArrowDownLeft}
          tone={overview.aReceber > 0 ? 'warn' : 'good'}
        />
      </div>

      <Card>
        <CardHeader
          title={`Entradas de ${monthLabel(state.mesId)}`}
          subtitle={`${money(totalProprias)} seus, ${money(totalReembolsos)} de devolução`}
          actions={
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          }
        />
        <div className="card-body">
          <IncomeEditor ganhos={ganhos} pessoas={ledger.pessoas} onChange={setGanhos} />
        </div>
      </Card>
    </form>
  );
};
