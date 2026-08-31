import {ArrowRight, LifeBuoy, Target} from 'lucide-react';
import {Card, CardHeader} from '../../components/ui/Card';
import {money} from '../../lib/format';
import type {MetaProgress} from '../../lib/selectors';

type Props = {
  metas: MetaProgress[];
  reservaSaldo: number;
  reservaObjetivo: number;
  aportesMes: number;
  onOpenGoals: () => void;
  onOpenReserve: () => void;
};

export const PlanningCard = ({
  metas,
  reservaSaldo,
  reservaObjetivo,
  aportesMes,
  onOpenGoals,
  onOpenReserve,
}: Props) => {
  const emDia = metas.slice(0, 3);
  const progressoReserva = reservaObjetivo > 0 ? Math.min(reservaSaldo / reservaObjetivo, 1) : 0;

  return (
    <Card>
      <CardHeader
        title="Planejamento"
        subtitle={aportesMes > 0 ? `${money(aportesMes)} guardados neste mês` : 'Nada guardado neste mês ainda'}
      />
      <div className="rows card-list">
        <button type="button" className="row-item row-item-button" onClick={onOpenReserve}>
          <span className="row-icon tone-good" aria-hidden="true"><LifeBuoy size={16} /></span>
          <div className="row-main">
            <span className="row-title">Reserva de emergência</span>
            <span className="row-meta">
              {reservaObjetivo > 0
                ? `${Math.round(progressoReserva * 100)}% de ${money(reservaObjetivo)}`
                : 'Sem objetivo definido'}
            </span>
            <span className="progress" aria-hidden="true">
              <i style={{transform: `scaleX(${progressoReserva})`}} />
            </span>
          </div>
          <strong className="row-value">{money(reservaSaldo)}</strong>
        </button>

        {emDia.map(item => (
          <button type="button" className="row-item row-item-button" key={item.meta.id} onClick={onOpenGoals}>
            <span className="row-icon" aria-hidden="true"><Target size={16} /></span>
            <div className="row-main">
              <span className="row-title">{item.meta.descricao}</span>
              <span className="row-meta">{money(item.saldo)} de {money(item.meta.valor_alvo)}</span>
              <span className="progress" aria-hidden="true">
                <i style={{transform: `scaleX(${item.progresso})`}} />
              </span>
            </div>
            <strong className="row-value">{Math.round(item.progresso * 100)}%</strong>
          </button>
        ))}
      </div>
      <div className="card-foot">
        <button type="button" className="link-btn" onClick={onOpenGoals}>
          {metas.length > 3 ? `Ver todas as ${metas.length} metas` : 'Gerenciar metas'}{' '}
          <ArrowRight size={13} style={{verticalAlign: -2}} />
        </button>
      </div>
    </Card>
  );
};
