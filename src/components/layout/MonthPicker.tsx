import {useEffect, useRef, useState} from 'react';
import {Calendar, ChevronLeft, ChevronRight} from 'lucide-react';
import {monthLabel, toMesId} from '../../lib/format';

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

type Props = {
  mesId: string;
  subtitle: string;
  onSelect: (mesId: string) => void;
};

/**
 * Escolha direta do mês. Antes só dava para andar de um em um, e chegar a
 * dezembro do ano que vem custava doze cliques.
 *
 * O popover abre a partir do próprio título, com a origem da transformação no
 * gatilho. A troca de mês em si não anima: é a ação mais repetida do aplicativo.
 */
export const MonthPicker = ({mesId, subtitle, onSelect}: Props) => {
  const [open, setOpen] = useState(false);
  const [ano, setAno] = useState(() => Number(mesId.slice(0, 4)));
  const wrapRef = useRef<HTMLDivElement>(null);
  const hoje = toMesId(new Date());

  useEffect(() => {
    if (!open) return;
    setAno(Number(mesId.slice(0, 4)));
  }, [open, mesId]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const escolher = (indice: number) => {
    onSelect(`${ano}-${String(indice + 1).padStart(2, '0')}`);
    setOpen(false);
  };

  return (
    <div className="month-picker" ref={wrapRef}>
      <button
        type="button"
        className="month-trigger"
        onClick={() => setOpen(current => !current)}
        aria-expanded={open}
        aria-haspopup="dialog">
        <span className="month-trigger-text">
          <span className="month-trigger-name">{monthLabel(mesId)}</span>
          <span className="month-trigger-sub">{subtitle}</span>
        </span>
        <Calendar size={15} aria-hidden="true" />
      </button>

      {open && (
        <div className="month-pop" role="dialog" aria-label="Escolher mês">
          <div className="month-pop-head">
            <button
              type="button"
              className="icon-btn"
              onClick={() => setAno(current => current - 1)}
              aria-label={`Ano ${ano - 1}`}>
              <ChevronLeft size={16} />
            </button>
            <strong className="num">{ano}</strong>
            <button
              type="button"
              className="icon-btn"
              onClick={() => setAno(current => current + 1)}
              aria-label={`Ano ${ano + 1}`}>
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="month-grid">
            {MESES.map((nome, indice) => {
              const alvo = `${ano}-${String(indice + 1).padStart(2, '0')}`;
              return (
                <button
                  type="button"
                  key={alvo}
                  className={[
                    'month-cell',
                    alvo === mesId ? 'is-selected' : '',
                    alvo === hoje ? 'is-today' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => escolher(indice)}
                  aria-current={alvo === mesId ? 'true' : undefined}>
                  {nome}
                </button>
              );
            })}
          </div>

          <div className="month-pop-foot">
            <button
              type="button"
              className="link-btn"
              onClick={() => {
                onSelect(hoje);
                setOpen(false);
              }}>
              Ir para {monthLabel(hoje)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
