import {ArrowDownLeft, HandCoins, Plus, Trash2, TrendingUp} from 'lucide-react';
import type {ReactNode} from 'react';
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

/**
 * Editor de entradas, separado por dono do dinheiro. Receita sua e devolução de
 * terceiro somam coisas diferentes: uma entra no seu saldo, a outra só abate a
 * dívida de alguém. Misturar as duas em uma lista só escondia justamente o
 * número que a pessoa quer ver, o total de cada lado.
 */
export const IncomeEditor = ({ganhos, pessoas, onChange, allowReimbursements = true}: Props) => {
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
        const total = grupo.linhas.reduce((acc, linha) => acc + (linha.item.valor || 0), 0);
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
              grupo.linhas.map(({item, index}) => (
                <article className="income-card" key={item.id}>
                  <div className="income-grid">
                    <Field label="Descrição" wide>
                      <input
                        className="input"
                        required
                        value={item.descricao}
                        onChange={event => update(index, {descricao: event.target.value})}
                        placeholder={grupo.chave === 'reembolsos' ? 'Ex: devolução do mercado' : 'Ex: salário'}
                      />
                    </Field>
                    <Field label="Valor">
                      <MoneyInput
                        required
                        value={item.valor ? money(item.valor) : ''}
                        onChange={value => update(index, {valor: parseMoney(value)})}
                      />
                    </Field>
                    <Field label="Dia de entrada" hint="Posiciona a entrada na projeção diária.">
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

                    {allowReimbursements && (
                      <Field label="Origem" wide>
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
                    )}
                  </div>

                  <div className="income-card-foot">
                    <button
                      type="button"
                      className="link-btn is-danger"
                      onClick={() => remove(index)}>
                      <Trash2 size={14} aria-hidden="true" /> Remover {item.descricao || 'entrada'}
                    </button>
                  </div>
                </article>
              ))
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
