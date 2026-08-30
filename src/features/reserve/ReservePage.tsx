import {useMemo, useState, type FormEvent} from 'react';
import {LifeBuoy, ShieldCheck, Trash2, TrendingDown, TrendingUp, Wallet} from 'lucide-react';
import {Card, CardHeader} from '../../components/ui/Card';
import {EmptyState} from '../../components/ui/EmptyState';
import {Field} from '../../components/ui/Field';
import {MoneyInput} from '../../components/ui/MoneyInput';
import {MovementModal} from '../../components/ui/MovementModal';
import {KpiCard} from '../overview/KpiCard';
import {reservaService} from '../../services';
import {reservaSaldo} from '../../lib/selectors';
import {money, parseMoney, shortDate} from '../../lib/format';
import {errorMessage} from '../../lib/errors';
import type {TipoMovimento} from '../../types';
import type {PageProps} from '../../app/pageProps';

export const ReservePage = ({state, ledger, overview}: PageProps) => {
  const [objetivo, setObjetivo] = useState(() =>
    ledger.reserva?.objetivo ? money(ledger.reserva.objetivo) : '',
  );
  const [aporteMensal, setAporteMensal] = useState(() =>
    ledger.reserva?.aporte_mensal ? money(ledger.reserva.aporte_mensal) : '',
  );
  const [movimentando, setMovimentando] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  const saldo = useMemo(() => reservaSaldo(ledger.reservaMovimentos), [ledger.reservaMovimentos]);
  const alvo = ledger.reserva?.objetivo || 0;
  const progresso = alvo > 0 ? Math.min(saldo / alvo, 1) : 0;
  const movimentos = [...ledger.reservaMovimentos].reverse();

  /** O rombo do mês é o que a reserva teria de cobrir se nada mudar. */
  const rombo = overview.saldoProjetado < 0 ? Math.abs(overview.saldoProjetado) : 0;
  const cobre = saldo >= rombo;

  const salvarObjetivo = async (event: FormEvent) => {
    event.preventDefault();
    if (!ledger.reserva) return;
    setBusy(true);
    setError('');
    setFeedback('');
    try {
      await reservaService.updateObjetivo(ledger.reserva.id, parseMoney(objetivo), parseMoney(aporteMensal));
      await ledger.reload();
      setFeedback('Objetivo da reserva atualizado.');
    } catch (err) {
      setError(errorMessage(err, 'Não foi possível salvar o objetivo.'));
    } finally {
      setBusy(false);
    }
  };

  const registrarMovimento = async (valor: number, tipo: TipoMovimento, informacao: string) => {
    await reservaService.addMovimento({mesId: state.mesId, valor, tipo, informacao});
    setMovimentando(false);
    await ledger.reload();
  };

  const removerMovimento = async (id: string) => {
    setBusy(true);
    try {
      await reservaService.removeMovimento(id);
      await ledger.reload();
    } catch (err) {
      setError(errorMessage(err, 'Não foi possível remover o movimento.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="enter" style={{display: 'flex', flexDirection: 'column', gap: 16}}>
      {error && <p className="banner" role="alert">{error}</p>}
      {feedback && !error && <p className="banner banner-info" role="status">{feedback}</p>}

      <div className="grid grid-kpi">
        <KpiCard
          label="Saldo da reserva"
          value={saldo}
          footnote={
            alvo > 0
              ? `${Math.round(progresso * 100)}% do objetivo de ${money(alvo)}`
              : 'Sem objetivo definido'
          }
          icon={ShieldCheck}
          tone="good"
        />
        <KpiCard
          label="Saldo do mês sem a reserva"
          value={overview.saldoProjetado}
          footnote="Entradas próprias menos contas e aportes"
          icon={Wallet}
          tone={overview.saldoProjetado >= 0 ? 'good' : 'bad'}
        />
        <KpiCard
          label="Saldo do mês com a reserva"
          value={overview.saldoComReserva}
          footnote="O colchão entra só se você precisar"
          icon={LifeBuoy}
          tone={overview.saldoComReserva >= 0 ? 'good' : 'bad'}
        />
      </div>

      {rombo > 0 && (
        <p className={cobre ? 'banner banner-info' : 'banner'} role="status">
          {cobre
            ? `Faltam ${money(rombo)} para fechar o mês. A reserva cobre esse valor e ainda sobram ${money(saldo - rombo)}.`
            : `Faltam ${money(rombo)} para fechar o mês e a reserva tem ${money(saldo)}. O descoberto é de ${money(rombo - saldo)}.`}
        </p>
      )}

      <Card>
        <CardHeader
          title="Movimentar a reserva"
          subtitle="Guardar tira do saldo do mês. Resgatar devolve para ele."
          actions={
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setMovimentando(true)}>
              Novo movimento
            </button>
          }
        />
        <div style={{marginTop: 12}}>
          {movimentos.length === 0 ? (
            <EmptyState
              icon={<LifeBuoy size={22} />}
              title="Reserva vazia"
              description="Guarde um primeiro valor. Ele fica fora do saldo do mês e só volta quando você resgatar."
              action={
                <button type="button" className="btn btn-ghost" onClick={() => setMovimentando(true)}>
                  Guardar agora
                </button>
              }
            />
          ) : (
            <div className="rows">
              {movimentos.map(movimento => (
                <div className="row-item" key={movimento.id}>
                  <span
                    className={`row-icon ${movimento.tipo === 'aporte' ? 'tone-good' : 'tone-bad'}`}
                    aria-hidden="true">
                    {movimento.tipo === 'aporte' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  </span>
                  <div className="row-main">
                    <span className="row-title">{movimento.tipo === 'aporte' ? 'Guardado' : 'Resgatado'}</span>
                    <span className="row-meta">
                      {shortDate(movimento.data)}
                      {movimento.informacao && <span className="pill">{movimento.informacao}</span>}
                    </span>
                  </div>
                  <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                    <strong className={`row-value ${movimento.tipo === 'aporte' ? 'text-good' : 'text-bad'}`}>
                      {movimento.tipo === 'aporte' ? '+' : '-'}
                      {money(movimento.valor)}
                    </strong>
                    <button
                      type="button"
                      className="icon-btn is-danger"
                      disabled={busy}
                      onClick={() => removerMovimento(movimento.id)}
                      aria-label="Remover movimento">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="Objetivo da reserva" subtitle="Uma referência comum são seis meses de despesas fixas." />
        <form className="card-body" onSubmit={salvarObjetivo}>
          <div className="form-grid">
            <Field label="Valor do colchão">
              <MoneyInput value={objetivo} onChange={setObjetivo} />
            </Field>
            <Field label="Aporte mensal planejado" hint="Serve de lembrete. O valor real é o que você movimenta.">
              <MoneyInput value={aporteMensal} onChange={setAporteMensal} />
            </Field>
          </div>
          <div className="form-actions" style={{marginTop: 16}}>
            <button type="submit" className="btn btn-primary" disabled={busy}>Salvar objetivo</button>
          </div>
        </form>
      </Card>

      {movimentando && (
        <MovementModal
          title="Reserva de emergência"
          subtitle={`Você tem ${money(saldo)} guardados. O movimento entra no mês aberto.`}
          saldoAtual={saldo}
          onClose={() => setMovimentando(false)}
          onConfirm={registrarMovimento}
        />
      )}
    </div>
  );
};
