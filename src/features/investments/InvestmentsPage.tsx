import {useMemo, useState} from 'react';
import {
  ChevronDown,
  Coins,
  LineChart,
  Pencil,
  Plus,
  Target,
  Trash2,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import {Card, CardHeader} from '../../components/ui/Card';
import {EmptyState} from '../../components/ui/EmptyState';
import {Field, SelectWrap} from '../../components/ui/Field';
import {MoneyInput} from '../../components/ui/MoneyInput';
import {MovementModal} from '../../components/ui/MovementModal';
import {Segmented} from '../../components/ui/Segmented';
import {KpiCard} from '../overview/KpiCard';
import {MovementList} from './MovementList';
import {RatesCard} from './RatesCard';
import {investimentoService} from '../../services';
import {
  TIPO_LABEL,
  posicoesInvestimento,
  resumoCarteira,
  taxaMediaCarteira,
} from '../../lib/investments';
import {money, parseMoney, shortDate, toMesId} from '../../lib/format';
import {saiuDoMes} from '../../lib/selectors';
import {errorMessage} from '../../lib/errors';
import type {
  Investimento,
  InvestimentoMovimento,
  OrigemAporte,
  TipoInvestimento,
  TipoMovimento,
} from '../../types';
import type {PageProps} from '../../app/pageProps';

const FORM_VAZIO = {
  descricao: '',
  tipo: 'cdi' as TipoInvestimento,
  indicePercentual: '100',
  taxaFixa: '10',
  metaId: '',
  aporteInicial: '',
  /*
   * Quem cadastra uma aplicação quase sempre está registrando dinheiro que já
   * estava lá. Descontar isso do mês faria o mês parecer pior do que foi, então
   * o padrão do saldo inicial é dinheiro de fora.
   */
  origemInicial: 'externo' as OrigemAporte,
};

const TIPOS: {value: TipoInvestimento; label: string; ajuda: string}[] = [
  {value: 'cdi', label: 'CDI', ajuda: 'CDB, LCI, LCA e fundos DI. Informe o percentual do CDI.'},
  {value: 'selic', label: 'Selic', ajuda: 'Tesouro Selic e afins. Informe o percentual da Selic.'},
  {value: 'poupanca', label: 'Poupança', ajuda: 'Rende a regra da poupança, sem parâmetro a informar.'},
  {value: 'prefixado', label: 'Prefixado', ajuda: 'Taxa travada na aplicação. Informe o valor ao ano.'},
  {value: 'ipca', label: 'IPCA mais taxa', ajuda: 'Tesouro IPCA e afins. Informe só o juro real.'},
];

const usaIndice = (tipo: TipoInvestimento) => tipo === 'cdi' || tipo === 'selic';
const usaTaxaFixa = (tipo: TipoInvestimento) => tipo === 'prefixado' || tipo === 'ipca';

export const InvestmentsPage = ({state, ledger}: PageProps) => {
  const [form, setForm] = useState(FORM_VAZIO);
  const [editando, setEditando] = useState<Investimento | null>(null);
  const [movimentando, setMovimentando] = useState<Investimento | null>(null);
  const [extratoAberto, setExtratoAberto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const posicoes = useMemo(
    () => posicoesInvestimento(ledger.investimentos, ledger.investimentoMovimentos, ledger.rates),
    [ledger.investimentos, ledger.investimentoMovimentos, ledger.rates],
  );
  const carteira = useMemo(() => resumoCarteira(posicoes), [posicoes]);
  const taxaMedia = useMemo(() => taxaMediaCarteira(posicoes), [posicoes]);

  const nomeDaMeta = (metaId?: string | null) =>
    metaId ? ledger.metas.find(item => item.id === metaId)?.descricao : undefined;

  /*
   * O mês tem duas histórias diferentes: o que saiu do recebimento deste mês, e
   * o que só foi registrado porque já era seu. Somar os dois esconderia
   * justamente a diferença que faz o saldo do mês bater.
   */
  const aportadoNoMes = useMemo(() => {
    const doMes = ledger.investimentoMovimentos.filter(item => item.mes_id === state.mesId);
    const soma = (lista: InvestimentoMovimento[]) =>
      lista.reduce((acc, item) => acc + (item.tipo === 'resgate' ? -item.valor : item.valor), 0);
    return {
      caixa: soma(doMes.filter(saiuDoMes)),
      fora: soma(doMes.filter(item => !saiuDoMes(item))),
    };
  }, [ledger.investimentoMovimentos, state.mesId]);

  const notaDoMes =
    aportadoNoMes.caixa !== 0 && aportadoNoMes.fora !== 0
      ? `${money(aportadoNoMes.caixa)} saiu do mês, ${money(aportadoNoMes.fora)} já era seu`
      : aportadoNoMes.caixa !== 0
        ? `${money(aportadoNoMes.caixa)} saiu do saldo deste mês`
        : aportadoNoMes.fora !== 0
          ? `${money(aportadoNoMes.fora)} registrado sem mexer no mês`
          : 'Estimativa no patamar de hoje';

  const limpar = () => {
    setForm(FORM_VAZIO);
    setEditando(null);
  };

  const abrirEdicao = (investimento: Investimento) => {
    setEditando(investimento);
    setForm({
      descricao: investimento.descricao,
      tipo: investimento.tipo,
      indicePercentual: String(investimento.indice_percentual ?? 100),
      taxaFixa: String(investimento.taxa_fixa ?? 0),
      metaId: investimento.meta_id || '',
      aporteInicial: '',
      origemInicial: FORM_VAZIO.origemInicial,
    });
  };

  const salvar = async () => {
    if (!form.descricao.trim()) return;
    setBusy(true);
    setError('');
    try {
      const salvo = await investimentoService.save({
        id: editando?.id,
        descricao: form.descricao,
        tipo: form.tipo,
        indicePercentual: usaIndice(form.tipo) ? Number(form.indicePercentual) || 0 : 100,
        taxaFixa: usaTaxaFixa(form.tipo) ? Number(form.taxaFixa) || 0 : 0,
        metaId: form.metaId || null,
        editando,
      });

      /* O aporte inicial só existe na criação: ao editar, o histórico não muda. */
      const inicial = parseMoney(form.aporteInicial);
      if (!editando && inicial > 0) {
        await investimentoService.addMovimento({
          investimentoId: salvo.id,
          mesId: state.mesId,
          valor: inicial,
          tipo: 'aporte',
          informacao: form.origemInicial === 'externo' ? 'Saldo já aplicado' : 'Aporte inicial',
          origem: form.origemInicial,
        });
      }

      limpar();
      await ledger.reload();
    } catch (err) {
      setError(errorMessage(err, 'Não foi possível salvar a aplicação.'));
    } finally {
      setBusy(false);
    }
  };

  const remover = async (id: string) => {
    setBusy(true);
    setError('');
    try {
      await investimentoService.remove(id);
      if (editando?.id === id) limpar();
      await ledger.reload();
    } catch (err) {
      setError(errorMessage(err, 'Não foi possível remover a aplicação.'));
    } finally {
      setBusy(false);
    }
  };

  const registrarMovimento = async (
    valor: number,
    tipo: TipoMovimento,
    informacao: string,
    origem: OrigemAporte,
  ) => {
    if (!movimentando) return;
    await investimentoService.addMovimento({
      investimentoId: movimentando.id,
      mesId: state.mesId,
      valor,
      tipo,
      informacao,
      origem,
    });
    setMovimentando(null);
    await ledger.reload();
  };

  /* Corrigir a origem muda o saldo do mês na hora, então o mês recarrega junto. */
  const trocarOrigem = async (movimento: InvestimentoMovimento, origem: OrigemAporte) => {
    setBusy(true);
    setError('');
    try {
      await investimentoService.setMovimentoOrigem(movimento.id, origem);
      await Promise.all([ledger.reload(), state.reload()]);
    } catch (err) {
      setError(errorMessage(err, 'Não foi possível mudar a origem do movimento.'));
    } finally {
      setBusy(false);
    }
  };

  const removerMovimento = async (movimento: InvestimentoMovimento) => {
    setBusy(true);
    setError('');
    try {
      await investimentoService.removeMovimento(movimento.id);
      await Promise.all([ledger.reload(), state.reload()]);
    } catch (err) {
      setError(errorMessage(err, 'Não foi possível excluir o movimento.'));
    } finally {
      setBusy(false);
    }
  };

  const posicaoAberta = movimentando
    ? posicoes.find(item => item.investimento.id === movimentando.id)
    : null;

  const ajudaDoTipo = TIPOS.find(item => item.value === form.tipo)?.ajuda || '';

  return (
    <div className="enter page-stack">
      {error && <p className="banner" role="alert">{error}</p>}
      {ledger.error && <p className="banner" role="alert">{ledger.error}</p>}

      <div className="grid grid-kpi">
        <KpiCard
          label="Saldo bruto"
          value={carteira.bruto}
          footnote={
            carteira.aplicado > 0
              ? `${carteira.rentabilidade.toFixed(2).replace('.', ',')}% desde o primeiro aporte`
              : 'Nenhuma aplicação ainda'
          }
          icon={Wallet}
          tone="good"
        />
        <KpiCard
          label="Total aplicado"
          value={carteira.aplicado}
          footnote={`${ledger.investimentos.length} aplicação(ões)`}
          icon={Coins}
        />
        <KpiCard
          label="Rendimento acumulado"
          value={carteira.rendimento}
          footnote={
            taxaMedia > 0
              ? `Taxa média de ${taxaMedia.toFixed(2).replace('.', ',')}% ao ano`
              : 'Sem taxa definida ainda'
          }
          icon={TrendingUp}
          tone="info"
        />
        <KpiCard
          label="Rende por mês"
          value={carteira.rendimentoMensalEstimado}
          footnote={notaDoMes}
          icon={LineChart}
        />
      </div>

      <RatesCard rates={ledger.rates} loading={ledger.ratesLoading} onRefresh={ledger.refreshRates} />

      <div className="grid grid-workbench">
        <Card>
          <CardHeader
            title="Sua carteira"
            subtitle="O rendimento é recalculado a cada leitura, pelo tempo que cada aporte passou aplicado. Abra o extrato para dizer o que saiu do mês e o que já era seu."
          />
          <div className="card-list">
            {posicoes.length === 0 ? (
              <EmptyState
                icon={<TrendingUp size={22} />}
                title="Nenhuma aplicação cadastrada"
                description="Cadastre onde o seu dinheiro está no formulário ao lado. Você diz se o valor saiu do recebimento do mês ou se já era seu, e só o primeiro caso desconta do saldo."
              />
            ) : (
              <div className="rows">
                {posicoes.map(posicao => {
                  const meta = nomeDaMeta(posicao.investimento.meta_id);
                  const aberto = extratoAberto === posicao.investimento.id;
                  const foraDoMes = posicao.movimentos.filter(item => !saiuDoMes(item)).length;
                  return (
                    <article
                      className={`invest-row ${editando?.id === posicao.investimento.id ? 'is-editing' : ''}`.trim()}
                      key={posicao.investimento.id}>
                      <span className="row-icon tone-info" aria-hidden="true">
                        <TrendingUp size={16} />
                      </span>

                      <div className="invest-main">
                        <div className="invest-title-line">
                          <span className="row-title">{posicao.investimento.descricao}</span>
                          <strong className="money invest-bruto">{money(posicao.bruto)}</strong>
                        </div>

                        <span className="row-meta">
                          <span className="pill">{TIPO_LABEL[posicao.investimento.tipo]}</span>
                          {usaIndice(posicao.investimento.tipo) && (
                            <span className="pill">
                              {posicao.investimento.indice_percentual}% do índice
                            </span>
                          )}
                          <span className="pill pill-info">
                            {posicao.taxaAoAno.toFixed(2).replace('.', ',')}% ao ano
                          </span>
                          {meta && (
                            <span className="pill pill-good">
                              <Target size={11} aria-hidden="true" /> {meta}
                            </span>
                          )}
                          {foraDoMes > 0 && (
                            <span className="pill">
                              {foraDoMes} movimento(s) fora do mês
                            </span>
                          )}
                        </span>

                        <div className="invest-figures">
                          <span>
                            Aplicado <b className="money">{money(posicao.aplicado)}</b>
                          </span>
                          <span>
                            Rendimento{' '}
                            <b className={`money ${posicao.rendimento >= 0 ? 'text-good' : 'text-bad'}`}>
                              {money(posicao.rendimento)}
                            </b>
                          </span>
                          <span>
                            Rende por mês <b className="money">{money(posicao.rendimentoMensalEstimado)}</b>
                          </span>
                          {posicao.primeiroAporte && (
                            <span className="text-muted">Desde {shortDate(posicao.primeiroAporte)}</span>
                          )}
                        </div>

                        {aberto && (
                          <MovementList
                            movimentos={posicao.movimentos}
                            busy={busy}
                            onChangeOrigem={trocarOrigem}
                            onRemove={removerMovimento}
                          />
                        )}
                      </div>

                      <div className="invest-actions">
                        <button
                          type="button"
                          className={`btn btn-ghost btn-sm ${aberto ? 'is-active' : ''}`.trim()}
                          aria-expanded={aberto}
                          onClick={() =>
                            setExtratoAberto(current =>
                              current === posicao.investimento.id ? null : posicao.investimento.id,
                            )
                          }>
                          Extrato ({posicao.movimentos.length})
                          <ChevronDown size={14} className={`chevron ${aberto ? 'is-open' : ''}`.trim()} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => setMovimentando(posicao.investimento)}>
                          Movimentar
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => abrirEdicao(posicao.investimento)}
                          aria-label={`Editar ${posicao.investimento.descricao}`}>
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          className="icon-btn is-danger"
                          disabled={busy}
                          onClick={() => remover(posicao.investimento.id)}
                          aria-label={`Remover ${posicao.investimento.descricao}`}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </Card>

        <aside className="workbench-side">
          <Card>
            <CardHeader
              title={editando ? 'Editar aplicação' : 'Nova aplicação'}
              subtitle={
                editando
                  ? 'Mudar a taxa recalcula o rendimento de todo o histórico.'
                  : 'Diga onde o dinheiro está e como ele rende.'
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
                <Field label="Nome da aplicação">
                  <input
                    className="input"
                    value={form.descricao}
                    onChange={event => setForm({...form, descricao: event.target.value})}
                    placeholder="Ex: CDB do banco digital"
                  />
                </Field>

                <Field label="Como rende" hint={ajudaDoTipo}>
                  <SelectWrap>
                    <select
                      className="select"
                      value={form.tipo}
                      onChange={event => setForm({...form, tipo: event.target.value as TipoInvestimento})}>
                      {TIPOS.map(tipo => (
                        <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                      ))}
                    </select>
                  </SelectWrap>
                </Field>

                {usaIndice(form.tipo) && (
                  <Field
                    label="Percentual do índice"
                    hint="110 significa 110% do índice. Cem é o índice cheio.">
                    <div className="input-suffix">
                      <input
                        className="input num"
                        type="number"
                        min={0}
                        step={0.5}
                        value={form.indicePercentual}
                        onChange={event => setForm({...form, indicePercentual: event.target.value})}
                      />
                      <span aria-hidden="true">%</span>
                    </div>
                  </Field>
                )}

                {usaTaxaFixa(form.tipo) && (
                  <Field
                    label={form.tipo === 'ipca' ? 'Juro real ao ano' : 'Taxa ao ano'}
                    hint={
                      form.tipo === 'ipca'
                        ? 'Só a parte que vem depois do IPCA. A inflação entra sozinha.'
                        : 'A taxa travada no momento da aplicação.'
                    }>
                    <div className="input-suffix">
                      <input
                        className="input num"
                        type="number"
                        min={0}
                        step={0.1}
                        value={form.taxaFixa}
                        onChange={event => setForm({...form, taxaFixa: event.target.value})}
                      />
                      <span aria-hidden="true">% a.a.</span>
                    </div>
                  </Field>
                )}

                <Field
                  label="Apontar para uma meta"
                  hint="O saldo desta aplicação passa a contar no progresso da meta.">
                  <SelectWrap>
                    <select
                      className="select"
                      value={form.metaId}
                      onChange={event => setForm({...form, metaId: event.target.value})}>
                      <option value="">Nenhuma meta</option>
                      {ledger.metas.map(meta => (
                        <option key={meta.id} value={meta.id}>{meta.descricao}</option>
                      ))}
                    </select>
                  </SelectWrap>
                </Field>

                {!editando && (
                  <>
                    <Field
                      label="Saldo inicial"
                      hint="Opcional. Quanto já está aplicado nesta conta hoje.">
                      <MoneyInput
                        value={form.aporteInicial}
                        onChange={value => setForm({...form, aporteInicial: value})}
                      />
                    </Field>

                    {parseMoney(form.aporteInicial) > 0 && (
                      <Field
                        label="De onde veio esse dinheiro"
                        hint={
                          form.origemInicial === 'externo'
                            ? 'Já era seu antes. Entra na carteira sem descontar do saldo do mês.'
                            : `Sai do saldo de ${toMesId(new Date()) === state.mesId ? 'hoje' : 'do mês aberto'}, como qualquer despesa.`
                        }
                        wide>
                        <Segmented
                          ariaLabel="Origem do saldo inicial"
                          value={form.origemInicial}
                          onChange={value => setForm({...form, origemInicial: value})}
                          options={[
                            {value: 'externo', label: 'Já era meu'},
                            {value: 'mes', label: 'Saiu do mês'},
                          ]}
                        />
                      </Field>
                    )}
                  </>
                )}
              </div>

              <div className="form-actions form-actions-stack">
                {editando && (
                  <button type="button" className="btn btn-ghost" onClick={limpar}>Cancelar</button>
                )}
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={salvar}
                  disabled={busy || !form.descricao.trim()}>
                  {editando ? 'Salvar alterações' : (<><Plus size={16} /> Cadastrar aplicação</>)}
                </button>
              </div>
            </div>
          </Card>
        </aside>
      </div>

      {movimentando && posicaoAberta && (
        <MovementModal
          title={movimentando.descricao}
          subtitle={`Saldo bruto de ${money(posicaoAberta.bruto)}, sendo ${money(posicaoAberta.rendimento)} de rendimento. O movimento entra no mês aberto.`}
          saldoAtual={posicaoAberta.bruto}
          perguntaOrigem
          onClose={() => setMovimentando(null)}
          onConfirm={registrarMovimento}
        />
      )}
    </div>
  );
};
