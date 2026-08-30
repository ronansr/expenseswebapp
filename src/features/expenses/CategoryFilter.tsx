import {useEffect, useRef, useState} from 'react';
import {ChevronDown, SlidersHorizontal} from 'lucide-react';
import type {CategoriaDespesa} from '../../types';
import {money} from '../../lib/format';

type Props = {
  categorias: CategoriaDespesa[];
  totals: Map<string, {count: number; total: number}>;
  selected: string[];
  onChange: (ids: string[]) => void;
  grandTotal: number;
};

export const CategoryFilter = ({categorias, totals, selected, onChange, grandTotal}: Props) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter(item => item !== id) : [...selected, id]);

  const selectedTotal = selected.reduce((acc, id) => acc + (totals.get(id)?.total || 0), 0);

  return (
    <div className="filter-menu" ref={wrapRef}>
      <button type="button" className="btn btn-ghost" onClick={() => setOpen(current => !current)} aria-expanded={open}>
        <SlidersHorizontal size={16} />
        {selected.length ? `${selected.length} categoria(s)` : 'Todas as categorias'}
        <ChevronDown size={15} />
      </button>

      {open && (
        <div className="filter-pop">
          <div className="filter-head">
            Filtrar categorias
            <button type="button" className="link-btn" onClick={() => onChange(categorias.map(item => item.id))}>
              Selecionar todas
            </button>
          </div>
          <div className="filter-list">
            {categorias.map(category => {
              const stat = totals.get(category.id) || {count: 0, total: 0};
              return (
                <label className="filter-option" key={category.id}>
                  <input
                    type="checkbox"
                    checked={selected.includes(category.id)}
                    onChange={() => toggle(category.id)}
                  />
                  <span>
                    {category.descricao}
                    <small>{stat.count} despesa(s)</small>
                  </span>
                  <b className="money">{money(stat.total)}</b>
                </label>
              );
            })}
          </div>
          <div className="filter-foot">
            {selected.length ? money(selectedTotal) : money(grandTotal)} no filtro atual
            <button type="button" className="link-btn is-danger" onClick={() => onChange([])}>Limpar</button>
          </div>
        </div>
      )}
    </div>
  );
};
