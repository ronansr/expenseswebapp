import {useState} from 'react';
import {Modal} from '../../components/ui/Modal';
import {expenseService} from '../../services';
import type {Despesa} from '../../types';
import {errorMessage} from '../../lib/errors';

type DeleteMode = 'single' | 'installments' | 'fixed-all' | 'fixed-from-month';

type Props = {
  expense: Despesa;
  onClose: () => void;
  onDeleted: () => Promise<void>;
};

/** Mesmos quatro modos de exclusão da versão anterior, com as mesmas condições. */
const buildOptions = (expense: Despesa) => [
  {
    mode: 'single' as const,
    title: 'Apenas está despesa',
    description: 'Remove somente este lançamento do mês atual.',
  },
  ...(expense.groupId
    ? [{
        mode: 'installments' as const,
        title: 'Todas as parcelas',
        description: 'Remove todos os lançamentos vinculados a está compra parcelada.',
      }]
    : []),
  ...(expense.despesa_fixa_id
    ? [
        {
          mode: 'fixed-from-month' as const,
          title: 'Fixa a partir deste mês',
          description: 'Remove está despesa fixa deste mês em diante.',
        },
        {
          mode: 'fixed-all' as const,
          title: 'Fixa em todos os meses',
          description: 'Remove todos os lançamentos desta despesa fixa.',
        },
      ]
    : []),
];

export const DeleteExpenseModal = ({expense, onClose, onDeleted}: Props) => {
  const options = buildOptions(expense);
  const [mode, setMode] = useState<DeleteMode>('single');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const selected = options.find(option => option.mode === mode) || options[0];

  const remove = async () => {
    setDeleting(true);
    setError('');
    try {
      await expenseService.remove(expense, mode);
      await onDeleted();
    } catch (err) {
      setError(errorMessage(err, 'Não foi possível excluir a despesa.'));
      setDeleting(false);
    }
  };

  return (
    <Modal
      title="Excluir despesa"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button type="button" className="btn btn-danger" onClick={remove} disabled={deleting}>
            {deleting ? 'Excluindo...' : 'Confirmar exclusão'}
          </button>
        </>
      }>
      {error && <p className="banner" role="alert">{error}</p>}
      <p className="text-muted">{expense.descricao}</p>
      <div>
        {options.map(option => (
          <button
            key={option.mode}
            type="button"
            className="choice"
            aria-pressed={mode === option.mode}
            onClick={() => setMode(option.mode)}>
            <span className="choice-dot" aria-hidden="true" />
            <span>
              <strong>{option.title}</strong>
              <small>{option.description}</small>
            </span>
          </button>
        ))}
      </div>
      <p className="banner" role="status">{selected.description} Está ação não pode ser desfeita.</p>
    </Modal>
  );
};
