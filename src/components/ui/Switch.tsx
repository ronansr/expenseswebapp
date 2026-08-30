type SwitchProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export const Switch = ({label, checked, onChange}: SwitchProps) => (
  <label className="switch">
    <input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} />
    <span className="switch-track" aria-hidden="true" />
    <span>{label}</span>
  </label>
);
