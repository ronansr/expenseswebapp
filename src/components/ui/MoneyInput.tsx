import {formatMoneyInput} from '../../lib/format';

type MoneyInputProps = {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  id?: string;
};

/** Máscara de moeda preservada: digitos entram pela direita e viram R$ 0,00. */
export const MoneyInput = ({value, onChange, required, id}: MoneyInputProps) => (
  <input
    id={id}
    className="input money"
    inputMode="numeric"
    required={required}
    value={value}
    placeholder="R$ 0,00"
    onChange={event => onChange(formatMoneyInput(event.target.value))}
  />
);
