import {useState, type FormEvent} from 'react';
import {Card, CardHeader} from '../../components/ui/Card';
import {IncomeEditor} from './IncomeEditor';
import {monthService} from '../../services';
import {activeGains} from '../../lib/selectors';
import {money, monthLabel} from '../../lib/format';
import {errorMessage} from '../../lib/errors';
import type {ValorResumo} from '../../types';
import type {PageProps} from '../../app/pageProps';

export const IncomePage = ({dashboard, state, ledger}: PageProps) => {
  const [ganhos, setGanhos] = useState<ValorResumo[]>(activeGains(dashboard.mes_info.ganhos_mes));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const total = ganhos.reduce((acc, item) => acc + (item.valor || 0), 0);

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
    <form className="enter" onSubmit={submit} style={{display: 'flex', flexDirection: 'column', gap: 16}}>
      {error && <p className="banner" role="alert">{error}</p>}
      {saved && !error && <p className="banner banner-info" role="status">Entradas salvas para {monthLabel(state.mesId)}.</p>}

      <Card>
        <CardHeader
          title={`Entradas de ${monthLabel(state.mesId)}`}
          subtitle={`Total previsto: ${money(total)}`}
          actions={<button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>}
        />
        <div className="card-body">
          <IncomeEditor ganhos={ganhos} pessoas={ledger.pessoas} onChange={setGanhos} />
        </div>
      </Card>
    </form>
  );
};
