import {useEffect, useRef} from 'react';
import {Search, X} from 'lucide-react';

type Props = {
  value: string;
  onChange: (value: string) => void;
  /** Quantas despesas sobraram, para a pessoa saber que a busca respondeu. */
  encontradas: number;
};

/**
 * Busca de despesa. Digitar é a interação mais frequente desta tela, então a
 * lista se refaz na hora: nada de esperar Enter, nada de animar resultado.
 * A tecla Esc limpa, porque é o gesto que todo mundo já tenta.
 */
export const ExpenseSearch = ({value, onChange, encontradas}: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);

  /* A barra "/" foca a busca, do jeito que já é hábito em lista longa. */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
      const alvo = event.target as HTMLElement | null;
      const digitando =
        alvo?.tagName === 'INPUT' || alvo?.tagName === 'TEXTAREA' || alvo?.isContentEditable;
      if (digitando) return;
      event.preventDefault();
      inputRef.current?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="search-field">
      <Search size={16} aria-hidden="true" />
      <input
        ref={inputRef}
        type="search"
        className="input"
        value={value}
        placeholder="Buscar despesa"
        aria-label="Buscar despesa por nome, categoria, pessoa ou valor"
        onChange={event => onChange(event.target.value)}
        onKeyDown={event => {
          if (event.key === 'Escape' && value) {
            event.preventDefault();
            onChange('');
          }
        }}
      />
      {value && (
        <button type="button" className="icon-btn search-clear" onClick={() => onChange('')} aria-label="Limpar busca">
          <X size={14} />
        </button>
      )}
      <span className="sr-only" role="status">
        {value ? `${encontradas} despesa(s) encontrada(s)` : ''}
      </span>
    </div>
  );
};
