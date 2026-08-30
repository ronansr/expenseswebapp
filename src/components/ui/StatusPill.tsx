import {STATUS_LATE, STATUS_PAID} from '../../lib/selectors';

const LABEL: Record<number, string> = {0: 'Pendente', 1: 'Pago', 2: 'Atrasado'};
const TONE: Record<number, string> = {0: 'pill', 1: 'pill pill-good', 2: 'pill pill-bad'};

export const statusLabel = (status: number) => LABEL[status] ?? LABEL[0];

export const StatusPill = ({status}: {status: number}) => (
  <span className={TONE[status] ?? TONE[0]}>{statusLabel(status)}</span>
);

export const isPaid = (status: number) => status === STATUS_PAID;
export const isLate = (status: number) => status === STATUS_LATE;
