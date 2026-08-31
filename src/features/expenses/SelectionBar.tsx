import {money} from '../../lib/format';

type Props = {
  quantidade: number;
  total: number;
  pago: number;
  aPagar: number;
  onSelectAll: () => void;
  onClear: () => void;
  onExit: () => void;
};

/**
 * Resumo do que está marcado. Fica preso ao rodapé porque a conta precisa
 * acompanhar a rolagem: a pessoa marca uma despesa lá embaixo e quer ver o total
 * mudar sem voltar ao topo.
 *
 * Ela entra uma vez, com 220ms de deslocamento vertical, porque aparecer do nada
 * na base da tela desorienta. Marcar cada despesa depois disso não anima nada.
 */
export const SelectionBar = ({
  quantidade,
  total,
  pago,
  aPagar,
  onSelectAll,
  onClear,
  onExit,
}: Props) => (
  <div className="selection-bar" role="status" aria-live="polite">
    <div className="selection-figures">
      <span className="selection-count">
        {quantidade === 0
          ? 'Nenhuma despesa marcada'
          : `${quantidade} despesa(s) marcada(s)`}
      </span>
      <strong className="selection-total money">{money(total)}</strong>
      {quantidade > 0 && (
        <span className="selection-split">
          <span><i className="selection-dot is-paid" aria-hidden="true" /> {money(pago)} pagas</span>
          <span><i className="selection-dot is-due" aria-hidden="true" /> {money(aPagar)} a pagar</span>
        </span>
      )}
    </div>

    <div className="selection-actions">
      {quantidade === 0 ? (
        <button type="button" className="btn btn-ghost btn-sm" onClick={onSelectAll}>
          Marcar todas
        </button>
      ) : (
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClear}>
          Desmarcar
        </button>
      )}
      <button type="button" className="btn btn-primary btn-sm" onClick={onExit}>
        Concluir
      </button>
    </div>
  </div>
);
