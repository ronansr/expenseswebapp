import {Plus, Trash2, TrendingUp} from 'lucide-react';
import {Field, SelectWrap} from '../../components/ui/Field';
import {MoneyInput} from '../../components/ui/MoneyInput';
import {EmptyState} from '../../components/ui/EmptyState';
import type {Pessoa, ValorResumo} from '../../types';
import {money, nowIso, parseMoney, uuid} from '../../lib/format';
import {isReimbursement} from '../../lib/selectors';

type Props = {
  ganhos: ValorResumo[];
  pessoas: Pessoa[];
  onChange: (ganhos: ValorResumo[]) => void;
};

/**
 * Editor de entradas. A estrutura de ValorResumo continua a mesma, com dois
 * campos novos: origem e pessoa. Uma devolução de terceiro não conta como
 * receita sua, ela só quita o que você adiantou.
 */
export const IncomeEditor = ({ganhos, pessoas, onChange}: Props) => {
  const update = (index: number, patch: Partial<ValorResumo>) =>
    onChange(ganhos.map((item, current) => (current === index ? {...item, ...patch, last_update: nowIso()} : item)));

  const add = () =>
    onChange([
      ...ganhos,
      {
        id: uuid(),
        descricao: '',
        valor: 0,
        dia_entrada: 1,
        origem: 'propria',
        pessoa_id: null,
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

  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: 16}}>
      {ganhos.length === 0 ? (
        <EmptyState
          icon={<TrendingUp size={22} />}
          title="Nenhuma entrada cadastrada"
          description="Adicione salário, pró-labore ou qualquer receita que entra no mês."
          action={
            <button type="button" className="btn btn-primary" onClick={add}>
              <Plus size={16} /> Adicionar entrada
            </button>
          }
        />
      ) : (
        <>
          {ganhos.map((item, index) => (
            <div className="income-block" key={item.id}>
              <div className="income-row">
                <Field label="Descrição">
                  <input
                    className="input"
                    required
                    value={item.descricao}
                    onChange={event => update(index, {descricao: event.target.value})}
                    placeholder="Ex: salário"
                  />
                </Field>
                <Field label="Valor">
                  <MoneyInput
                    required
                    value={item.valor ? money(item.valor) : ''}
                    onChange={value => update(index, {valor: parseMoney(value)})}
                  />
                </Field>
                <Field label="Dia">
                  <input
                    className="input num"
                    type="number"
                    min={1}
                    max={31}
                    required
                    value={item.dia_entrada || 1}
                    onChange={event => update(index, {dia_entrada: Number(event.target.value)})}
                  />
                </Field>
                <button
                  type="button"
                  className="icon-btn is-danger"
                  onClick={() => onChange(ganhos.filter((_, current) => current !== index))}
                  aria-label={`Remover ${item.descricao || 'entrada'}`}>
                  <Trash2 size={16} />
                </button>
              </div>

              <Field
                label="Origem"
                hint={
                  isReimbursement(item)
                    ? 'Devolução de terceiro. Não entra no seu saldo, só abate a dívida da pessoa.'
                    : 'Receita sua. Entra no saldo disponível do mês.'
                }
                wide>
                <SelectWrap>
                  <select
                    className="select"
                    value={item.pessoa_id || 'propria'}
                    onChange={event => trocarOrigem(index, event.target.value)}>
                    <option value="propria">Receita minha</option>
                    {pessoas.map(pessoa => (
                      <option key={pessoa.id} value={pessoa.id}>Devolução de {pessoa.nome}</option>
                    ))}
                  </select>
                </SelectWrap>
              </Field>
            </div>
          ))}
          <div>
            <button type="button" className="btn btn-ghost" onClick={add}>
              <Plus size={16} /> Adicionar entrada
            </button>
          </div>
        </>
      )}
    </div>
  );
};
