import {useState, type FormEvent} from 'react';
import {Plus} from 'lucide-react';
import {Modal} from '../../components/ui/Modal';
import {Field, SelectWrap} from '../../components/ui/Field';
import {MoneyInput} from '../../components/ui/MoneyInput';
import {Segmented} from '../../components/ui/Segmented';
import {Switch} from '../../components/ui/Switch';
import {categoryService, expenseService} from '../../services';
import type {DashboardData, Despesa, Pessoa} from '../../types';
import {money, parseMoney, toInputDate} from '../../lib/format';
import {errorMessage} from '../../lib/errors';

type LaunchKind = 'avista' | 'parcelado' | 'recorrente';

type Props = {
  dashboard: DashboardData;
  editing: Despesa | null;
  pessoas: Pessoa[];
  onClose: () => void;
  onSaved: () => Promise<void>;
};

const initialKind = (editing: Despesa | null): LaunchKind => {
  if (editing?.despesa_fixa_id) return 'recorrente';
  if ((editing?.totalParcelas || 1) > 1) return 'parcelado';
  return 'avista';
};

/**
 * Regras preservadas: o salvamento continua chamando expenseService.save com o
 * mesmo contrato. O seletor de tipo apenas traduz a intencao para os campos que
 * já existiam (totalParcelas e despesa fixa).
 */
export const ExpenseFormModal = ({dashboard, editing, pessoas, onClose, onSaved}: Props) => {
  const [kind, setKind] = useState<LaunchKind>(initialKind(editing));
  const [form, setForm] = useState({
    vencimento: editing ? toInputDate(editing.vencimento) : `${dashboard.mes_info.id}-01`,
    descricao: editing?.descricao || '',
    valor: editing ? money(editing.valor) : '',
    informacao: editing?.informacao || '',
    parcela: editing?.parcela || 1,
    totalParcelas: editing?.totalParcelas || 1,
    categoriaId: editing?.categoriaId || dashboard.categoria_despesas[0]?.id || '',
    paid: editing?.status === 1,
    pessoaId: editing?.pessoa_id || '',
  });
  const [newCategory, setNewCategory] = useState('');
  const [categories, setCategories] = useState(dashboard.categoria_despesas);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const patch = (values: Partial<typeof form>) => setForm(current => ({...current, ...values}));

  const changeKind = (next: LaunchKind) => {
    setKind(next);
    if (next === 'avista') patch({parcela: 1, totalParcelas: 1});
    if (next === 'parcelado' && form.totalParcelas < 2) patch({totalParcelas: 2});
    if (next === 'recorrente') patch({parcela: 1, totalParcelas: 1});
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await expenseService.save({
        id: editing?.id,
        vencimento: form.vencimento,
        descricao: form.descricao,
        categoriaId: form.categoriaId,
        valor: parseMoney(form.valor),
        informacao: form.informacao,
        parcela: kind === 'parcelado' ? Number(form.parcela) : 1,
        totalParcelas: kind === 'parcelado' ? Number(form.totalParcelas) : 1,
        paid: form.paid,
        fixa: kind === 'recorrente',
        pessoaId: form.pessoaId || null,
        editing,
      });
      await onSaved();
    } catch (err) {
      setError(errorMessage(err, 'Não foi possível salvar a despesa.'));
      setSaving(false);
    }
  };

  const addCategory = async () => {
    const label = newCategory.trim();
    if (!label) return;
    try {
      const created = await categoryService.create(label);
      setCategories(current => [...current, created].sort((a, b) => a.descricao.localeCompare(b.descricao)));
      patch({categoriaId: created.id});
      setNewCategory('');
    } catch (err) {
      setError(errorMessage(err, 'Não foi possível criar a categoria.'));
    }
  };

  return (
    <Modal
      title={editing ? 'Editar despesa' : 'Nova despesa'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" form="expense-form" className="btn btn-primary" disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar despesa'}
          </button>
        </>
      }>
      <form id="expense-form" onSubmit={submit} style={{display: 'contents'}}>
        {error && <p className="banner" role="alert">{error}</p>}

        <div className="form-grid">
          <Field label="Valor">
            <MoneyInput required value={form.valor} onChange={value => patch({valor: value})} />
          </Field>

          <Field label="Categoria">
            <SelectWrap>
              <select
                className="select"
                required
                value={form.categoriaId}
                onChange={event => patch({categoriaId: event.target.value})}>
                <option value="">Selecione</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>{category.descricao}</option>
                ))}
              </select>
            </SelectWrap>
          </Field>

          <Field label="Vencimento">
            <input
              className="input"
              type="date"
              required
              value={form.vencimento}
              onChange={event => patch({vencimento: event.target.value})}
            />
          </Field>

          <Field label="Descrição">
            <input
              className="input"
              required
              value={form.descricao}
              onChange={event => patch({descricao: event.target.value})}
              placeholder="Ex: Conta de luz"
            />
          </Field>
        </div>

        <Field label="Tipo de lançamento" wide>
          <Segmented
            ariaLabel="Tipo de lançamento"
            value={kind}
            onChange={changeKind}
            options={[
              {value: 'avista', label: 'A vista'},
              {value: 'parcelado', label: 'Parcelado'},
              {value: 'recorrente', label: 'Recorrente'},
            ]}
          />
        </Field>

        {kind === 'parcelado' && (
          <div className="form-grid">
            <Field label="Parcela atual" hint="A partir dela as futuras são geradas.">
              <input
                className="input num"
                type="number"
                min={1}
                value={form.parcela}
                onChange={event => patch({parcela: Number(event.target.value)})}
              />
            </Field>
            <Field label="Total de parcelas">
              <input
                className="input num"
                type="number"
                min={1}
                value={form.totalParcelas}
                onChange={event => patch({totalParcelas: Number(event.target.value)})}
              />
            </Field>
          </div>
        )}

        <Field
          label="De quem é está despesa"
          hint="Marque uma pessoa quando você pagou por ela. O valor sai dos seus totais e vira crédito a receber."
          wide>
          <SelectWrap>
            <select
              className="select"
              value={form.pessoaId}
              onChange={event => patch({pessoaId: event.target.value})}>
              <option value="">É minha</option>
              {pessoas.map(pessoa => (
                <option key={pessoa.id} value={pessoa.id}>{pessoa.nome}</option>
              ))}
            </select>
          </SelectWrap>
        </Field>

        {form.pessoaId && (
          <p className="banner banner-info">
            Está despesa fica fora do seu saldo. Quando a pessoa devolver o dinheiro, cadastre a devolução em
            Receitas escolhendo o nome dela.
          </p>
        )}

        {kind === 'recorrente' && (
          <p className="banner banner-info">
            A despesa será repetida automaticamente nos meses seguintes, mantendo o dia do vencimento.
          </p>
        )}

        <Field label="Observações" hint="Opcional." wide>
          <input
            className="input"
            value={form.informacao}
            onChange={event => patch({informacao: event.target.value})}
            placeholder="Ex: compras do mês"
          />
        </Field>

        <Field label="Nova categoria" hint="Cria e já seleciona a categoria." wide>
          <span style={{display: 'flex', gap: 12}}>
            <input
              className="input"
              value={newCategory}
              onChange={event => setNewCategory(event.target.value)}
              placeholder="Nome da categoria"
            />
            <button type="button" className="btn btn-ghost" onClick={addCategory}>
              <Plus size={16} /> Criar
            </button>
          </span>
        </Field>

        <Switch label="Já foi paga" checked={form.paid} onChange={value => patch({paid: value})} />
      </form>
    </Modal>
  );
};
