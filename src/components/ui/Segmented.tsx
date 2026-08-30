type Option<T extends string> = {value: T; label: string};

type SegmentedProps<T extends string> = {
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
};

export const Segmented = <T extends string>({value, options, onChange, ariaLabel}: SegmentedProps<T>) => (
  <div className="segmented" role="group" aria-label={ariaLabel}>
    {options.map(option => (
      <button
        key={option.value}
        type="button"
        className="segment"
        aria-pressed={value === option.value}
        onClick={() => onChange(option.value)}>
        <span className="segment-dot" aria-hidden="true" />
        {option.label}
      </button>
    ))}
  </div>
);
