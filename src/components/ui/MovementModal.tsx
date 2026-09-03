import {useState, type FormEvent} from 'react';
import {Modal} from './Modal';
import {Field} from './Field';
import {MoneyInput} from './MoneyInput';
import {Segmented} from './Segmented';
import {parseMoney} from '../../lib/format';
import type {OrigemAporte, TipoMovimento} from '../../types';

type Props = {
  title: string;
  subtitle: string;
  saldoAtual: number;
  /**
   * Investimento pergunta de onde veio o dinheiro, porque cadastrar uma
   * aplicação que já existia não pode descontar do salário do mês. Meta e
   * reserva não perguntam: ali o aporte é sempre uma decisão do mês.
   */
  perguntaOrigem?: boolean;
  origemInicial?: OrigemAporte;
  onClose: () => void;
  onConfirm: (
    valor: number,
    tipo: TipoMovimento,
    informacao: string,
    origem: OrigemAporte,
  ) => Promise<void>;
};

const ORIGEM_LABEL: Record<TipoMovimento, {label: string; opcoes: {value: OrigemAporte; label: string}[]}> = {
  aporte: {
    label: 'De onde veio o dinheiro',
    opcoes: [
      {value: 'mes', label: 'Do mês'},
      {value: 'externo', label: 'De fora do mês'},
    ],
  },
  resgate: {
    label: 'Para onde foi o dinheiro',
    opcoes: [
      {value: 'mes', label: 'Para a conta'},
      {value: 'externo', label: 'Fica fora'},
    ],
  },
};

const ORIGEM_HINT: Record<TipoMovimento, Record<OrigemAporte, string>> = {
  aporte: {
    mes: 'Desconta do saldo deste mês, igual a qualquer saída da conta.',
    externo: 'Dinheiro que já era seu antes. Entra na carteira sem mexer no saldo do mês.',
  },
  resgate: {
    mes: 'O valor volta para o saldo deste mês.',
    externo: 'Sai da carteira sem entrar no saldo do mês.',
  },
};

/** Aporte e resgate usam o mesmo formulário, em metas, reserva e investimentos. */
export const MovementModal = ({
  title,
  subtitle,
  saldoAtual,
  perguntaOrigem = false,
  origemInicial = 'mes',
  onClose,
  onConfirm,
}: Props) => {
  const [tipo, setTipo] = useState<TipoMovimento>('aporte');
  const [origem, setOrigem] = useState<OrigemAporte>(origemInicial);
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
      await onConfirm(quantia, tipo, informacao, origem);
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

        {perguntaOrigem && (
          <Field label={ORIGEM_LABEL[tipo].label} hint={ORIGEM_HINT[tipo][origem]} wide>
            <Segmented
              ariaLabel={ORIGEM_LABEL[tipo].label}
              value={origem}
              onChange={setOrigem}
              options={ORIGEM_LABEL[tipo].opcoes}
            />
          </Field>
        )}

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
