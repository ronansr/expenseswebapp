import {useState, type FormEvent} from 'react';
import {Modal} from './Modal';
import {Field} from './Field';
import {MoneyInput} from './MoneyInput';
import {Segmented} from './Segmented';
import {parseMoney} from '../../lib/format';
import type {TipoMovimento} from '../../types';

type Props = {
  title: string;
  subtitle: string;
  saldoAtual: number;
  onClose: () => void;
  onConfirm: (valor: number, tipo: TipoMovimento, informacao: string) => Promise<void>;
};

/** Aporte e resgate usam o mesmo formulário, em metas e na reserva. */
export const MovementModal = ({title, subtitle, saldoAtual, onClose, onConfirm}: Props) => {
  const [tipo, setTipo] = useState<TipoMovimento>('aporte');
  const [valor, setValor] = useState('');
  const [informacao, setInformacao] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const quantia = parseMoney(valor);
    if (quantia <= 0) {
      setError('Informe um valor maior que zero.');
      return;
    }
    if (tipo === 'resgate' && quantia > saldoAtual) {
      setError('O resgate não pode ser maior que o saldo guardado.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onConfirm(quantia, tipo, informacao);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar o movimento.');
      setSaving(false);
    }
  };

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" form="movement-form" className="btn btn-primary" disabled={saving}>
            {saving ? 'Salvando...' : 'Confirmar'}
          </button>
        </>
      }>
      <form id="movement-form" onSubmit={submit} style={{display: 'contents'}}>
        {error && <p className="banner" role="alert">{error}</p>}
        <p className="text-muted">{subtitle}</p>

        <Field label="Movimento" wide>
          <Segmented
            ariaLabel="Tipo de movimento"
            value={tipo}
            onChange={setTipo}
            options={[
              {value: 'aporte', label: 'Guardar'},
              {value: 'resgate', label: 'Resgatar'},
            ]}
          />
        </Field>

        <Field label="Valor">
          <MoneyInput required value={valor} onChange={setValor} />
        </Field>

        <Field label="Observação" hint="Opcional." wide>
          <input
            className="input"
            value={informacao}
            onChange={event => setInformacao(event.target.value)}
            placeholder="Ex: sobra do mês"
          />
        </Field>
      </form>
    </Modal>
  );
};
