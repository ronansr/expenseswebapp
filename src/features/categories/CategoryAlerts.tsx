import {ArrowRight, ShieldCheck, TriangleAlert} from 'lucide-react';
import {Card, CardHeader} from '../../components/ui/Card';
import {money} from '../../lib/format';
import type {CategoryAlert} from '../../lib/selectors';

type Props = {
  alerts: CategoryAlert[];
  /** Todos os tetos configurados, para saber se a ausência de alerta é boa notícia. */
  configurados: number;
  onManage: () => void;
};

/**
 * Alerta de teto. A frase é sempre sobre o futuro: onde o mês fecha se o ritmo
 * continuar, e quanto dá para gastar por dia sem estourar. Dizer "você gastou
 * muito" depois do estouro não muda decisão nenhuma.
 */
export const CategoryAlerts = ({alerts, configurados, onManage}: Props) => {
  if (configurados === 0) {
    return (
      <Card>
        <CardHeader
          title="Tetos de gasto"
          subtitle="Defina um limite por categoria e o aplicativo avisa antes de você estourar."
          actions={
            <button type="button" className="link-btn" onClick={onManage}>
              Definir tetos <ArrowRight size={13} style={{verticalAlign: -2}} />
            </button>
          }
        />
        <div className="card-body">
          <p className="text-muted" style={{fontSize: 13}}>
            Sem teto definido, o aviso não tem com o que comparar. Comece pela categoria em que o gasto mais
            varia de um mês para o outro.
          </p>
        </div>
      </Card>
    );
  }

  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader
          title="Tetos de gasto"
          subtitle={`${configurados} categoria(s) com teto definido`}
          actions={
            <button type="button" className="link-btn" onClick={onManage}>
              Ajustar <ArrowRight size={13} style={{verticalAlign: -2}} />
            </button>
          }
        />
        <div className="card-body">
          <p className="alert-clear">
            <span className="row-icon tone-good" aria-hidden="true"><ShieldCheck size={16} /></span>
            Nenhuma categoria caminha para estourar o teto neste mês.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Tetos de gasto"
        subtitle={`${alerts.length} categoria(s) pedindo atenção`}
        actions={
          <button type="button" className="link-btn" onClick={onManage}>
            Ajustar <ArrowRight size={13} style={{verticalAlign: -2}} />
          </button>
        }
      />
      <div className="card-list">
        <div className="rows">
          {alerts.map(alerta => {
            const uso = alerta.limite > 0 ? Math.min(alerta.gasto / alerta.limite, 1) : 0;
            const projetado = alerta.limite > 0 ? Math.min(alerta.projecao / alerta.limite, 1) : 0;
            return (
              <div className="limit-row" key={alerta.categoria.id}>
                <span
                  className={`row-icon ${alerta.nivel === 'estouro' ? 'tone-bad' : 'tone-warn'}`}
                  aria-hidden="true">
                  <TriangleAlert size={16} />
                </span>

                <div className="limit-main">
                  <div className="limit-title-line">
                    <span className="row-title">{alerta.categoria.descricao}</span>
                    <span className="limit-values money">
                      {money(alerta.gasto)} de {money(alerta.limite)}
                    </span>
                  </div>

                  {/* O traço claro é o gasto de hoje. O tique marca onde o mês fecha. */}
                  <span className="limit-track" aria-hidden="true">
                    <i className={`limit-fill ${alerta.nivel === 'estouro' ? 'is-over' : ''}`.trim()} style={{transform: `scaleX(${uso})`}} />
                    <i className="limit-marker" style={{left: `${projetado * 100}%`}} />
                  </span>

                  <p className="limit-message">{alerta.mensagem}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};
