import {ArrowDownLeft, CalendarClock, HandCoins, Plus, Trash2, TrendingUp} from 'lucide-react';
import type {ReactNode} from 'react';
import {SelectWrap} from '../../components/ui/Field';
import {MoneyInput} from '../../components/ui/MoneyInput';
import {EmptyState} from '../../components/ui/EmptyState';
import type {Pessoa, RecorrenciaEntrada, ValorResumo} from '../../types';
import {
  WEEKDAY_LABELS,
  WEEKDAY_OPTIONS,
  money,
  nowIso,
  parseMoney,
  quantidadeOcorrenciasEntrada,
  uuid,
  valorMensalEntrada,
} from '../../lib/format';
import {isReimbursement} from '../../lib/selectors';

type Props = {
  ganhos: ValorResumo[];
  pessoas: Pessoa[];
  mesId: string;
  onChange: (ganhos: ValorResumo[]) => void;
  /**
   * Devolução de terceiro não é receita recorrente de perfil, então a tela de
   * configurações desliga o grupo e mostra só o que é seu.
   */
  allowReimbursements?: boolean;
};

type Linha = {item: ValorResumo; index: number};

type Grupo = {
  chave: 'proprias' | 'reembolsos';
  titulo: string;
  descricao: string;
  icone: ReactNode;
  tom: 'good' | 'info';
  linhas: Linha[];
};

const recurrenceLabel = (item: ValorResumo, mesId: string) => {
  const count = quantidadeOcorrenciasEntrada(item, mesId);
  if (!item.recorrencia || item.recorrencia === 'mensal') return '1 vez no mês';
  if (item.recorrencia === 'semanal') return `${count} semana(s)`;
  if (item.recorrencia_diaria_modo === 'quantidade') return `${count} dia(s) no mês`;
  return `${count} ocorrência(s)`;
};

const weekdaysLabel = (item: ValorResumo) => {
  const days = item.dias_semana || [];
  if (!days.length) return 'Dia pelo campo de entrada';
  return days.map(day => WEEKDAY_LABELS[day] || '').filter(Boolean).join(', ');
};

/**
 * Editor de entradas, separado por dono do dinheiro. Receita sua e devolução de
 * terceiro somam coisas diferentes: uma entra no seu saldo, a outra só abate a
 * dívida de alguém.
 */
export const IncomeEditor = ({ganhos, pessoas, mesId, onChange, allowReimbursements = true}: Props) => {
  const update = (index: number, patch: Partial<ValorResumo>) =>
    onChange(ganhos.map((item, current) => (current === index ? {...item, ...patch, last_update: nowIso()} : item)));

  const remove = (index: number) => onChange(ganhos.filter((_, current) => current !== index));

  const add = (origem: 'propria' | 'reembolso') =>
    onChange([
      ...ganhos,
      {
        id: uuid(),
        descricao: '',
        valor: 0,
        dia_entrada: 1,
        origem,
        pessoa_id: origem === 'reembolso' ? pessoas[0]?.id || null : null,
        recorrencia: 'mensal',
        dias_semana: null,
        quantidade_dias: null,
        recorrencia_diaria_modo: null,
        add_date: nowIso(),
        last_update: nowIso(),
      },
    ]);

  const trocarOrigem = (index: number, valor: string) => {
    if (valor === 'propria') {
      update(index, {origem: 'propria', pessoa_id: null});
      return;
    }
    update(index, {origem: 'reembolso', pessoa_id: valor});
  };

  const trocarRecorrencia = (index: number, recorrencia: RecorrenciaEntrada) => {
    const item = ganhos[index];
    if (recorrencia === 'mensal') {
      update(index, {
        recorrencia,
        dias_semana: null,
        quantidade_dias: null,
        recorrencia_diaria_modo: null,
      });
      return;
    }

    if (recorrencia === 'semanal') {
      update(index, {
        recorrencia,
        dias_semana: item.dias_semana?.slice(0, 1) || [1],
        quantidade_dias: null,
        recorrencia_diaria_modo: null,
      });
      return;
    }

    update(index, {
      recorrencia,
      dias_semana: item.dias_semana?.length ? item.dias_semana : [1, 2, 3, 4, 5],
      quantidade_dias: item.quantidade_dias || 22,
      recorrencia_diaria_modo: item.recorrencia_diaria_modo || 'dias_semana',
    });
  };

  const toggleWeekday = (index: number, day: number) => {
    const item = ganhos[index];
    const current = item.dias_semana || [];
    const next = current.includes(day) ? current.filter(value => value !== day) : [...current, day];
    update(index, {dias_semana: next.sort((a, b) => a - b)});
  };

  const linhas: Linha[] = ganhos.map((item, index) => ({item, index}));
  const proprias = linhas.filter(linha => !isReimbursement(linha.item));
  const reembolsos = linhas.filter(linha => isReimbursement(linha.item));

  const grupos: Grupo[] = [
    {
      chave: 'proprias',
      titulo: 'Minhas receitas',
      descricao: 'Entram no saldo disponível do mês.',
      icone: <TrendingUp size={15} />,
      tom: 'good',
      linhas: proprias,
    },
  ];

  if (allowReimbursements && (reembolsos.length > 0 || pessoas.length > 0)) {
    grupos.push({
      chave: 'reembolsos',
      titulo: 'Devoluções de terceiros',
      descricao: 'Abatem a dívida da pessoa e ficam fora do seu saldo.',
      icone: <HandCoins size={15} />,
      tom: 'info',
      linhas: reembolsos,
    });
  }

  if (ganhos.length === 0) {
    return (
      <EmptyState
        icon={<TrendingUp size={22} />}
        title="Nenhuma entrada cadastrada"
        description="Adicione salário, pró-labore ou qualquer receita que entra no mês."
        action={
          <button type="button" className="btn btn-primary" onClick={() => add('propria')}>
            <Plus size={16} /> Adicionar entrada
          </button>
        }
      />
    );
  }

  return (
    <div className="income-groups">
      {grupos.map(grupo => {
        const total = grupo.linhas.reduce((acc, linha) => acc + valorMensalEntrada(linha.item, mesId), 0);
        return (
          <section className="income-group" key={grupo.chave}>
            <header className="income-group-head">
              <span className={`row-icon tone-${grupo.tom}`} aria-hidden="true">{grupo.icone}</span>
              <div className="income-group-text">
                <h3>{grupo.titulo}</h3>
                <p>{grupo.descricao}</p>
              </div>
              <div className="income-group-total">
                <span>{grupo.linhas.length} entrada(s)</span>
                <strong className={`money text-${grupo.tom === 'good' ? 'good' : 'muted'}`}>
                  {money(total)}
                </strong>
              </div>
            </header>

            {grupo.linhas.length === 0 ? (
              <p className="income-group-empty">
                {grupo.chave === 'reembolsos'
                  ? 'Nenhuma devolução registrada neste mês.'
                  : 'Nenhuma receita sua neste mês.'}
              </p>
            ) : (
              <div className="income-table" role="table" aria-label={grupo.titulo}>
                <div className="income-table-head" role="row">
                  <span>Descrição</span>
                  <span>Valor</span>
                  <span>Dia</span>
                  <span>Origem</span>
                  <span>Recorrência</span>
                  <span>Total do mês</span>
                  <span>Ações</span>
                </div>

                {grupo.linhas.map(({item, index}) => (
                  <article className="income-row" key={item.id} role="row">
                    <label className="income-cell income-description" data-label="Descrição">
                      <span className="income-cell-label">Descrição</span>
                      <input
                        className="input"
                        aria-label="Descrição"
                        required
                        value={item.descricao}
                        onChange={event => update(index, {descricao: event.target.value})}
                        placeholder={grupo.chave === 'reembolsos' ? 'Ex: devolução do mercado' : 'Ex: salário'}
                      />
                    </label>

                    <label className="income-cell income-value" data-label="Valor">
                      <span className="income-cell-label">Valor por vez</span>
                      <MoneyInput
                        required
                        value={item.valor ? money(item.valor) : ''}
                        onChange={value => update(index, {valor: parseMoney(value)})}
                      />
                    </label>

                    <label className="income-cell income-day" data-label="Dia">
                      <span className="income-cell-label">
                        {item.recorrencia === 'diaria' && item.recorrencia_diaria_modo === 'quantidade'
                          ? 'Dia ref.'
                          : 'Dia entrada'}
                      </span>
                      <input
                        className="input num"
                        type="number"
                        min={1}
                        max={31}
                        required
                        value={item.dia_entrada || 1}
                        onChange={event => update(index, {dia_entrada: Number(event.target.value)})}
                      />
                    </label>

                    <label className="income-cell income-origin" data-label="Origem">
                      <span className="income-cell-label">Origem</span>
                      {allowReimbursements ? (
                        <SelectWrap>
                          <select
                            className="select"
                            aria-label="Origem"
                            value={item.pessoa_id || 'propria'}
                            onChange={event => trocarOrigem(index, event.target.value)}>
                            <option value="propria">Receita minha</option>
                            {pessoas.map(pessoa => (
                              <option key={pessoa.id} value={pessoa.id}>Devolução de {pessoa.nome}</option>
                            ))}
                          </select>
                        </SelectWrap>
                      ) : (
                        <span className="income-static">Receita minha</span>
                      )}
                    </label>

                    <div className="income-cell income-recurrence" data-label="Recorrência">
                      <label>
                        <span className="income-cell-label">Recorrência</span>
                        <SelectWrap>
                          <select
                            className="select"
                            aria-label="Recorrência"
                            value={item.recorrencia || 'mensal'}
                            onChange={event => trocarRecorrencia(index, event.target.value as RecorrenciaEntrada)}>
                            <option value="mensal">Mensal</option>
                            <option value="semanal">Semanal</option>
                            <option value="diaria">Diária</option>
                          </select>
                        </SelectWrap>
                      </label>

                      {item.recorrencia === 'semanal' && (
                        <label className="income-weekday-select">
                          <span className="income-cell-label">Dia da semana</span>
                          <SelectWrap>
                            <select
                              className="select"
                              aria-label="Dia da semana"
                              value={item.dias_semana?.[0] ?? 1}
                              onChange={event => update(index, {dias_semana: [Number(event.target.value)]})}>
                              {WEEKDAY_OPTIONS.map(day => (
                                <option key={day.value} value={day.value}>{day.label}</option>
                              ))}
                            </select>
                          </SelectWrap>
                        </label>
                      )}

                      {item.recorrencia === 'diaria' && (
                        <div className="income-daily-options">
                          <label>
                            <span className="income-cell-label">Diário por</span>
                            <SelectWrap>
                              <select
                                className="select"
                                aria-label="Tipo de recorrência diária"
                                value={item.recorrencia_diaria_modo || 'dias_semana'}
                                onChange={event =>
                                  update(index, {
                                    recorrencia_diaria_modo: event.target.value as ValorResumo['recorrencia_diaria_modo'],
                                  })
                                }>
                                <option value="dias_semana">Dias da semana</option>
                                <option value="quantidade">Quantidade</option>
                              </select>
                            </SelectWrap>
                          </label>

                          {(item.recorrencia_diaria_modo || 'dias_semana') === 'dias_semana' ? (
                            <div className="income-weekdays" aria-label="Dias da semana">
                              {WEEKDAY_OPTIONS.map(day => (
                                <label
                                  key={day.value}
                                  className={`weekday-chip ${item.dias_semana?.includes(day.value) ? 'is-selected' : ''}`.trim()}>
                                  <input
                                    type="checkbox"
                                    checked={item.dias_semana?.includes(day.value) || false}
                                    onChange={() => toggleWeekday(index, day.value)}
                                  />
                                  <span>{day.label}</span>
                                </label>
                              ))}
                            </div>
                          ) : (
                            <label className="income-quantity">
                              <span className="income-cell-label">Dias no mes</span>
                              <input
                                className="input num"
                                type="number"
                                min={1}
                                max={31}
                                value={item.quantidade_dias || 1}
                                onChange={event => update(index, {quantidade_dias: Number(event.target.value)})}
                              />
                            </label>
                          )}
                        </div>
                      )}

                      <small className="income-recurrence-note">
                        <CalendarClock size={13} aria-hidden="true" />
                        {item.recorrencia === 'diaria' && item.recorrencia_diaria_modo !== 'quantidade'
                          ? weekdaysLabel(item)
                          : recurrenceLabel(item, mesId)}
                      </small>
                    </div>

                    <div className="income-cell income-month-total" data-label="Total do mês">
                      <span className="income-cell-label">Total do mês</span>
                      <strong className="money">{money(valorMensalEntrada(item, mesId))}</strong>
                      <small>{recurrenceLabel(item, mesId)}</small>
                    </div>

                    <div className="income-cell income-actions" data-label="Ações">
                      <button
                        type="button"
                        className="icon-btn is-danger"
                        aria-label={`Remover ${item.descricao || 'entrada'}`}
                        onClick={() => remove(index)}>
                        <Trash2 size={15} aria-hidden="true" />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}

            <button type="button" className="btn btn-ghost btn-sm" onClick={() => add(grupo.chave === 'reembolsos' ? 'reembolso' : 'propria')}>
              <Plus size={15} />
              {grupo.chave === 'reembolsos' ? 'Adicionar devolução' : 'Adicionar receita'}
            </button>
          </section>
        );
      })}

      {allowReimbursements && pessoas.length === 0 && (
        <p className="text-muted income-hint">
          <ArrowDownLeft size={14} aria-hidden="true" /> Cadastre uma pessoa para registrar devoluções e
          separar o que só passou pela sua conta.
        </p>
      )}
    </div>
  );
};
