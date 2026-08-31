import {useMemo, useState} from 'react';
import {Check, Flag, Pencil, PiggyBank, Plus, Target, TrendingUp, Trash2, X} from 'lucide-react';
import {Card, CardHeader} from '../../components/ui/Card';
import {EmptyState} from '../../components/ui/EmptyState';
import {Field} from '../../components/ui/Field';
import {MoneyInput} from '../../components/ui/MoneyInput';
import {MovementModal} from '../../components/ui/MovementModal';
import {KpiCard} from '../overview/KpiCard';
import {metaService} from '../../services';
import {metaComInvestimento, metaProgress} from '../../lib/selectors';
import {mesesParaAlvo, posicoesInvestimento, taxaMediaCarteira} from '../../lib/investments';
import {money, monthLabel, parseMoney, shortDate, toInputDate, toMesId} from '../../lib/format';
import {errorMessage} from '../../lib/errors';
import type {Meta, TipoMovimento} from '../../types';
import type {PageProps} from '../../app/pageProps';

const FORM_VAZIO = {descricao: '', valorAlvo: '', aporteMensal: '', dataAlvo: ''};

/** Onde o saldo chega no ritmo atual, dito em mês e não em quantidade de meses. */
const previsaoDeChegada = (meses: number | null) => {
  if (meses === null) return null;
  if (meses === 0) return 'alcançada';
  const alvo = new Date();
  alvo.setDate(1);
  alvo.setMonth(alvo.getMonth() + meses);
  return monthLabel(toMesId(alvo));
};

export const GoalsPage = ({state, ledger, onNavigate}: PageProps) => {
  const [form, setForm] = useState(FORM_VAZIO);
  const [editando, setEditando] = useState<Meta | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [movimentando, setMovimentando] = useState<Meta | null>(null);

  const progresso = useMemo(
    () => metaProgress(ledger.metas, ledger.metaMovimentos, state.mesId),
    [ledger.metas, ledger.metaMovimentos, state.mesId],
  );

  const posicoes = useMemo(
    () => posicoesInvestimento(ledger.investimentos, ledger.investimentoMovimentos, ledger.rates),
    [ledger.investimentos, ledger.investimentoMovimentos, ledger.rates],
  );

  /** Quanto cada meta tem de lastro em aplicações apontadas para ela. */
  const investidoPorMeta = useMemo(() => {
    const mapa = new Map<string, number>();
    posicoes.forEach(posicao => {
      const metaId = posicao.investimento.meta_id;
      if (!metaId) return;
      mapa.set(metaId, (mapa.get(metaId) || 0) + posicao.bruto);
    });
    return mapa;
  }, [posicoes]);

  const taxaCarteira = useMemo(() => taxaMediaCarteira(posicoes), [posicoes]);

  const linhas = progresso.map(item => ({
    ...item,
    lastro: metaComInvestimento(item, investidoPorMeta),
  }));

  const guardado = linhas.reduce((acc, item) => acc + item.saldo, 0);
  const investido = linhas.reduce((acc, item) => acc + item.lastro.investido, 0);
  const alvoTotal = linhas.reduce((acc, item) => acc + (item.meta.valor_alvo || 0), 0);
  const noMes = linhas.reduce((acc, item) => acc + item.aporteNoMes, 0);

  const limpar = () => {
    setForm(FORM_VAZIO);
    setEditando(null);
  };

  const abrirEdicao = (meta: Meta) => {
    setEditando(meta);
    setForm({
      descricao: meta.descricao,
      valorAlvo: meta.valor_alvo ? money(meta.valor_alvo) : '',
      aporteMensal: meta.aporte_mensal ? money(meta.aporte_mensal) : '',
      dataAlvo: meta.data_alvo ? toInputDate(meta.data_alvo) : '',
    });
  };

  const salvar = async () => {
    if (!form.descricao.trim()) return;
    setBusy(true);
    setError('');
    try {
      await metaService.save({
        id: editando?.id,
        descricao: form.descricao,
        valorAlvo: parseMoney(form.valorAlvo),
        aporteMensal: parseMoney(form.aporteMensal),
        dataAlvo: form.dataAlvo || null,
        editando,
      });
      limpar();
      await ledger.reload();
    } catch (err) {
      setError(errorMessage(err, 'Não foi possível salvar a meta.'));
    } finally {
      setBusy(false);
    }
  };

  const remover = async (id: string) => {
    setBusy(true);
    setError('');
    try {
      await metaService.remove(id);
      if (editando?.id === id) limpar();
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
    ? linhas.find(item => item.meta.id === movimentando.id)?.lastro.total || 0
    : 0;

  return (
    <div className="enter page-stack">
      {error && <p className="banner" role="alert">{error}</p>}
      {ledger.error && <p className="banner" role="alert">{ledger.error}</p>}

      <div className="grid grid-kpi">
        <KpiCard
          label="Guardado em metas"
          value={guardado}
          footnote={`${linhas.length} meta(s) em andamento`}
          icon={PiggyBank}
          tone="good"
        />
        <KpiCard
          label="Investido para as metas"
          value={investido}
          footnote={investido > 0 ? 'Aplicações apontadas para uma meta' : 'Nenhuma aplicação apontada ainda'}
          icon={TrendingUp}
          tone="info"
        />
        <KpiCard
          label="Falta para os objetivos"
          value={Math.max(alvoTotal - guardado - investido, 0)}
          footnote="Somando todos os alvos"
          icon={Flag}
        />
        <KpiCard
          label="Aportado neste mês"
          value={noMes}
          footnote="Já descontado do seu saldo"
          icon={Target}
        />
      </div>

      <div className="grid grid-workbench">
        <Card>
          <CardHeader
            title="Suas metas"
            subtitle="O aporte do mês entra no fluxo como uma saída."
          />
          <div className="card-list">
            {linhas.length === 0 ? (
              <EmptyState
                icon={<Target size={22} />}
                title="Nenhuma meta ainda"
                description="Crie um objetivo no formulário ao lado. O valor guardado sai do saldo disponível do mês."
              />
            ) : (
              <div className="rows">
                {linhas.map(item => {
                  const alcancada = item.lastro.falta === 0 && item.meta.valor_alvo > 0;
                  const meses = mesesParaAlvo(
                    item.lastro.total,
                    item.meta.valor_alvo || 0,
                    item.meta.aporte_mensal || 0,
                    item.lastro.investido > 0 ? taxaCarteira : 0,
                  );
                  const chegada = previsaoDeChegada(meses);
                  return (
                    <article
                      className={`goal-row ${editando?.id === item.meta.id ? 'is-editing' : ''}`.trim()}
                      key={item.meta.id}>
                      <span className={`row-icon ${alcancada ? 'tone-good' : ''}`.trim()} aria-hidden="true">
                        {alcancada ? <Check size={16} /> : <Target size={16} />}
                      </span>

                      <div className="goal-main">
                        <div className="goal-title-line">
                          <span className="row-title">{item.meta.descricao}</span>
                          <strong className="goal-percent num">
                            {Math.round(item.lastro.progresso * 100)}%
                          </strong>
                        </div>

                        <span className="progress" aria-hidden="true">
                          <i style={{transform: `scaleX(${item.lastro.progresso})`}} />
                        </span>

                        <span className="row-meta">
                          <b className="money">{money(item.lastro.total)}</b> de {money(item.meta.valor_alvo)}
                          {item.lastro.investido > 0 && (
                            <span className="pill pill-info">
                              {money(item.lastro.investido)} investidos
                            </span>
                          )}
                          {item.meta.data_alvo && (
                            <span className="pill">até {shortDate(item.meta.data_alvo)}</span>
                          )}
                          {item.meta.aporte_mensal > 0 && (
                            <span className="pill">{money(item.meta.aporte_mensal)} por mês</span>
                          )}
                        </span>

                        {chegada && !alcancada && (
                          <span className="goal-forecast">
                            {chegada === 'alcançada'
                              ? 'Objetivo alcançado.'
                              : `Nesse ritmo você chega em ${chegada}.`}
                            {item.lastro.investido > 0 && chegada !== 'alcançada' &&
                              ` Já contando o rendimento de ${taxaCarteira.toFixed(1)}% ao ano.`}
                          </span>
                        )}
                        {!chegada && !alcancada && item.meta.valor_alvo > 0 && (
                          <span className="goal-forecast">
                            Sem aporte mensal definido, não dá para prever a chegada.
                          </span>
                        )}
                      </div>

                      <div className="goal-actions">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => setMovimentando(item.meta)}>
                          Movimentar
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => abrirEdicao(item.meta)}
                          aria-label={`Editar ${item.meta.descricao}`}>
                          <Pencil size={16} />
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
                    </article>
                  );
                })}
              </div>
            )}
          </div>
          {ledger.investimentos.length === 0 && linhas.length > 0 && (
            <div className="card-foot">
              <button type="button" className="link-btn" onClick={() => onNavigate('investments')}>
                Aponte uma aplicação para uma meta e o rendimento passa a contar aqui
              </button>
            </div>
          )}
        </Card>

        <aside className="workbench-side">
          <Card>
            <CardHeader
              title={editando ? 'Editar meta' : 'Nova meta'}
              subtitle={
                editando
                  ? 'As alterações não mexem nos aportes já registrados.'
                  : 'Um objetivo, um valor e, se quiser, uma data.'
              }
              actions={
                editando ? (
                  <button type="button" className="icon-btn" onClick={limpar} aria-label="Cancelar edição">
                    <X size={16} />
                  </button>
                ) : undefined
              }
            />
            <div className="card-body">
              <div className="form-stack">
                <Field label="Objetivo">
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
                <Field label="Aporte mensal" hint="Usado para prever quando você chega ao alvo.">
                  <MoneyInput
                    value={form.aporteMensal}
                    onChange={value => setForm({...form, aporteMensal: value})}
                  />
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
              <div className="form-actions form-actions-stack">
                {editando && (
                  <button type="button" className="btn btn-ghost" onClick={limpar}>
                    Cancelar
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={salvar}
                  disabled={busy || !form.descricao.trim()}>
                  {editando ? 'Salvar alterações' : (<><Plus size={16} /> Criar meta</>)}
                </button>
              </div>
            </div>
          </Card>
        </aside>
      </div>

      {movimentando && (
        <MovementModal
          title={movimentando.descricao}
          subtitle={`Você tem ${money(saldoDaMetaAberta)} nesta meta, somando o guardado e o investido. O movimento entra no mês aberto.`}
          saldoAtual={linhas.find(item => item.meta.id === movimentando.id)?.saldo || 0}
          onClose={() => setMovimentando(null)}
          onConfirm={registrarMovimento}
        />
      )}
    </div>
  );
};
