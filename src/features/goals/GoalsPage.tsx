import {useMemo, useState} from 'react';
import {Check, Flag, PiggyBank, Plus, Target, Trash2} from 'lucide-react';
import {Card, CardHeader} from '../../components/ui/Card';
import {EmptyState} from '../../components/ui/EmptyState';
import {Field} from '../../components/ui/Field';
import {MoneyInput} from '../../components/ui/MoneyInput';
import {MovementModal} from '../../components/ui/MovementModal';
import {KpiCard} from '../overview/KpiCard';
import {metaService} from '../../services';
import {metaProgress} from '../../lib/selectors';
import {money, parseMoney, shortDate} from '../../lib/format';
import {errorMessage} from '../../lib/errors';
import type {Meta, TipoMovimento} from '../../types';
import type {PageProps} from '../../app/pageProps';

export const GoalsPage = ({state, ledger}: PageProps) => {
  const [form, setForm] = useState({descricao: '', valorAlvo: '', aporteMensal: '', dataAlvo: ''});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [movimentando, setMovimentando] = useState<Meta | null>(null);

  const progresso = useMemo(
    () => metaProgress(ledger.metas, ledger.metaMovimentos, state.mesId),
    [ledger.metas, ledger.metaMovimentos, state.mesId],
  );
  const guardado = progresso.reduce((acc, item) => acc + item.saldo, 0);
  const alvoTotal = progresso.reduce((acc, item) => acc + (item.meta.valor_alvo || 0), 0);
  const noMes = progresso.reduce((acc, item) => acc + item.aporteNoMes, 0);

  const criar = async () => {
    if (!form.descricao.trim()) return;
    setBusy(true);
    setError('');
    try {
      await metaService.save({
        descricao: form.descricao,
        valorAlvo: parseMoney(form.valorAlvo),
        aporteMensal: parseMoney(form.aporteMensal),
        dataAlvo: form.dataAlvo || null,
      });
      setForm({descricao: '', valorAlvo: '', aporteMensal: '', dataAlvo: ''});
      await ledger.reload();
    } catch (err) {
      setError(errorMessage(err, 'Não foi possível criar a meta.'));
    } finally {
      setBusy(false);
    }
  };

  const remover = async (id: string) => {
    setBusy(true);
    setError('');
    try {
      await metaService.remove(id);
      await ledger.reload();
    } catch (err) {
      setError(errorMessage(err, 'Não foi possível remover a meta.'));
    } finally {
      setBusy(false);
    }
  };

  const registrarMovimento = async (valor: number, tipo: TipoMovimento, informacao: string) => {
    if (!movimentando) return;
    await metaService.addMovimento({
      metaId: movimentando.id,
      mesId: state.mesId,
      valor,
      tipo,
      informacao,
    });
    setMovimentando(null);
    await ledger.reload();
  };

  const saldoDaMetaAberta = movimentando
    ? progresso.find(item => item.meta.id === movimentando.id)?.saldo || 0
    : 0;

  return (
    <div className="enter" style={{display: 'flex', flexDirection: 'column', gap: 16}}>
      {error && <p className="banner" role="alert">{error}</p>}
      {ledger.error && <p className="banner" role="alert">{ledger.error}</p>}

      <div className="grid grid-kpi">
        <KpiCard
          label="Guardado em metas"
          value={guardado}
          footnote={`${progresso.length} meta(s) em andamento`}
          icon={PiggyBank}
          tone="good"
        />
        <KpiCard
          label="Falta para os objetivos"
          value={Math.max(alvoTotal - guardado, 0)}
          footnote="Somando todos os alvos"
          icon={Flag}
        />
        <KpiCard
          label="Aportado neste mês"
          value={noMes}
          footnote="Já descontado do seu saldo"
          icon={Target}
          tone="info"
        />
      </div>

      <Card>
        <CardHeader title="Nova meta" subtitle="Um objetivo, um valor e, se quiser, uma data." />
        <div className="card-body">
          <div className="form-grid">
            <Field label="Objetivo" wide>
              <input
                className="input"
                value={form.descricao}
                onChange={event => setForm({...form, descricao: event.target.value})}
                placeholder="Ex: viagem em janeiro"
              />
            </Field>
            <Field label="Valor alvo">
              <MoneyInput value={form.valorAlvo} onChange={value => setForm({...form, valorAlvo: value})} />
            </Field>
            <Field label="Aporte mensal" hint="Quanto você pretende guardar por mês.">
              <MoneyInput value={form.aporteMensal} onChange={value => setForm({...form, aporteMensal: value})} />
            </Field>
            <Field label="Data alvo" hint="Opcional.">
              <input
                className="input"
                type="date"
                value={form.dataAlvo}
                onChange={event => setForm({...form, dataAlvo: event.target.value})}
              />
            </Field>
          </div>
          <div className="form-actions" style={{marginTop: 16}}>
            <button type="button" className="btn btn-primary" onClick={criar} disabled={busy || !form.descricao.trim()}>
              <Plus size={16} /> Criar meta
            </button>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Suas metas" subtitle="O aporte do mês entra no fluxo como uma saída." />
        <div style={{marginTop: 12}}>
          {progresso.length === 0 ? (
            <EmptyState
              icon={<Target size={22} />}
              title="Nenhuma meta ainda"
              description="Crie um objetivo acima e comece a guardar. O valor guardado sai do saldo disponível do mês."
            />
          ) : (
            <div className="rows">
              {progresso.map(item => (
                <div className="row-item" key={item.meta.id}>
                  <span className="row-icon tone-good" aria-hidden="true">
                    {item.falta === 0 && item.meta.valor_alvo > 0 ? <Check size={16} /> : <Target size={16} />}
                  </span>
                  <div className="row-main">
                    <span className="row-title">{item.meta.descricao}</span>
                    <span className="row-meta">
                      {money(item.saldo)} de {money(item.meta.valor_alvo)}
                      {item.meta.data_alvo && <span className="pill">até {shortDate(item.meta.data_alvo)}</span>}
                      {item.meta.aporte_mensal > 0 && (
                        <span className="pill pill-info">{money(item.meta.aporte_mensal)} por mês</span>
                      )}
                    </span>
                    <span className="progress" aria-hidden="true">
                      <i style={{transform: `scaleX(${item.progresso})`}} />
                    </span>
                  </div>
                  <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                    <strong className="row-value">{Math.round(item.progresso * 100)}%</strong>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMovimentando(item.meta)}>
                      Movimentar
                    </button>
                    <button
                      type="button"
                      className="icon-btn is-danger"
                      disabled={busy}
                      onClick={() => remover(item.meta.id)}
                      aria-label={`Remover ${item.meta.descricao}`}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {movimentando && (
        <MovementModal
          title={movimentando.descricao}
          subtitle={`Você tem ${money(saldoDaMetaAberta)} guardados nesta meta. O movimento entra no mês aberto.`}
          saldoAtual={saldoDaMetaAberta}
          onClose={() => setMovimentando(null)}
          onConfirm={registrarMovimento}
        />
      )}
    </div>
  );
};
