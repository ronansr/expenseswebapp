import {ArrowDownLeft, ArrowUpRight, Trash2} from 'lucide-react';
import {money, parseDate, shortDate} from '../../lib/format';
import {saiuDoMes} from '../../lib/selectors';
import type {InvestimentoMovimento, OrigemAporte} from '../../types';

type Props = {
  movimentos: InvestimentoMovimento[];
  /** Até onde a posição foi calculada. O que vier depois aparece, mas apagado. */
  referencia: Date;
  busy?: boolean;
  onChangeOrigem: (movimento: InvestimentoMovimento, origem: OrigemAporte) => void;
  onRemove: (movimento: InvestimentoMovimento) => void;
};

/**
 * Extrato da aplicação. Existe por um motivo prático: é aqui que se conserta um
 * aporte lançado como se tivesse saído do mês quando o dinheiro já era seu.
 * A marca de origem é o próprio botão que a corrige.
 */
export const MovementList = ({
  movimentos,
  referencia,
  busy = false,
  onChangeOrigem,
  onRemove,
}: Props) => {
  if (movimentos.length === 0) {
    return (
      <p className="movement-empty text-muted">
        Nenhum movimento ainda. Use Movimentar para registrar um aporte ou um resgate.
      </p>
    );
  }

  const recentes = [...movimentos].sort((a, b) => b.data.localeCompare(a.data));

  return (
    <div className="movement-list">
      <p className="movement-hint text-muted">
        A marca diz se o dinheiro passou pelo seu mês. Toque nela para corrigir.
      </p>

      {recentes.map(movimento => {
        const aporte = movimento.tipo !== 'resgate';
        const doMes = saiuDoMes(movimento);
        /* Movimento posterior ao mês aberto existe, mas não entrou na posição. */
        const depois = parseDate(movimento.data).getTime() > referencia.getTime();
        const proxima: OrigemAporte = doMes ? 'externo' : 'mes';
        const marca = aporte
          ? doMes ? 'Saiu do mês' : 'Veio de fora'
          : doMes ? 'Voltou para a conta' : 'Ficou fora';

        return (
          <div className={`movement-row ${depois ? 'is-later' : ''}`.trim()} key={movimento.id}>
            <span className={`row-icon ${aporte ? 'tone-info' : 'tone-good'}`} aria-hidden="true">
              {aporte ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
            </span>

            <div className="movement-main">
              <span className="movement-line">
                <b className="money">{money(movimento.valor)}</b>
                <span className="text-muted">{aporte ? 'aporte' : 'resgate'} em {shortDate(movimento.data)}</span>
              </span>
              {depois && (
                <small className="text-muted">
                  Depois de {shortDate(referencia)}, fora desta posição
                </small>
              )}
              {movimento.informacao && <small className="text-muted">{movimento.informacao}</small>}
            </div>

            <button
              type="button"
              className={`pill pill-toggle ${doMes ? 'pill-warn' : 'pill-good'}`}
              disabled={busy}
              aria-pressed={!doMes}
              title={
                doMes
                  ? 'Este valor desconta do saldo do mês. Toque para dizer que o dinheiro já era seu.'
                  : 'Este valor não mexe no saldo do mês. Toque para dizer que ele saiu do mês.'
              }
              onClick={() => onChangeOrigem(movimento, proxima)}>
              {marca}
            </button>

            <button
              type="button"
              className="icon-btn is-danger"
              disabled={busy}
              onClick={() => onRemove(movimento)}
              aria-label={`Excluir movimento de ${money(movimento.valor)}`}>
              <Trash2 size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
