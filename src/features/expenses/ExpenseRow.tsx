import {useState} from 'react';
import {Check, Pencil, Trash2} from 'lucide-react';
import type {CategoriaDespesa, Despesa, Pessoa} from '../../types';
import {money} from '../../lib/format';
import {STATUS_PAID} from '../../lib/selectors';
import {StatusPill} from '../../components/ui/StatusPill';
import {expenseService} from '../../services';

type Props = {
  expense: Despesa;
  categorias: CategoriaDespesa[];
  pessoas?: Pessoa[];
  onEdit: (expense: Despesa) => void;
  onDelete: (expense: Despesa) => void;
  onChanged: () => Promise<void>;
};

export const ExpenseRow = ({expense, categorias, pessoas = [], onEdit, onDelete, onChanged}: Props) => {
  const [toggling, setToggling] = useState(false);
  const paid = expense.status === STATUS_PAID;
  const category = categorias.find(item => item.id === expense.categoriaId)?.descricao || 'Sem categoria';
  const dono = expense.pessoa_id ? pessoas.find(item => item.id === expense.pessoa_id) : null;

  const togglePaid = async () => {
    setToggling(true);
    try {
      await expenseService.togglePaid(expense);
      await onChanged();
    } finally {
      setToggling(false);
    }
  };

  return (
    <article className={`expense ${paid ? 'is-paid' : ''} ${expense.pessoa_id ? 'is-third-party' : ''}`.trim()}>
      <button
        type="button"
        className="expense-check"
        onClick={togglePaid}
        disabled={toggling}
        aria-pressed={paid}
        aria-label={paid ? 'Marcar como pendente' : 'Marcar como paga'}>
        <Check size={14} strokeWidth={3} />
      </button>

      <div className="expense-info">
        <span className="expense-name">{expense.descricao}</span>
        <span className="expense-tags">
          <StatusPill status={expense.status} />
          <span className="pill">{category}</span>
          {expense.totalParcelas > 1 && (
            <span className="pill pill-info">{expense.parcela}/{expense.totalParcelas}</span>
          )}
          {expense.despesa_fixa_id && <span className="pill pill-warn">Fixa</span>}
          {expense.pessoa_id && (
            <span className="pill pill-info">{dono ? `De ${dono.nome}` : 'De terceiro'}</span>
          )}
        </span>
      </div>

      <strong className="expense-amount">{money(expense.valor)}</strong>

      <div className="expense-actions">
        <button type="button" className="icon-btn" onClick={() => onEdit(expense)} aria-label="Editar despesa">
          <Pencil size={16} />
        </button>
        <button
          type="button"
          className="icon-btn is-danger"
          onClick={() => onDelete(expense)}
          aria-label="Excluir despesa">
          <Trash2 size={16} />
        </button>
      </div>
    </article>
  );
};
