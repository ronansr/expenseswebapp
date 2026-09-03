import {addMonths, format, isValid, parseISO} from 'date-fns';
import {ptBR} from 'date-fns/locale';
import type {Despesa, ValorResumo} from '../types';

export const DEFAULT_CATEGORIES = [
  'Alimentacao',
  'Transporte',
  'Moradia',
  'Educacao',
  'Lazer',
];

export const nowIso = () => new Date().toISOString();
export const uuid = () => crypto.randomUUID();

export const toMesId = (date: string | Date) => {
  const parsed = typeof date === 'string' ? parseDate(date) : date;
  return format(parsed, 'yyyy-MM');
};

export const parseDate = (value: string) => {
  const parsed = value.includes('T') ? parseISO(value) : new Date(`${value}T12:00:00`);
  return isValid(parsed) ? parsed : new Date();
};

export const toInputDate = (value: string) => format(parseDate(value), 'yyyy-MM-dd');
export const toIsoFromInputDate = (value: string) => new Date(`${value}T12:00:00`).toISOString();

export const monthLabel = (mesId: string) => {
  const date = parseDate(`${mesId || toMesId(new Date())}-01`);
  return format(date, "MMMM 'de' yyyy", {locale: ptBR});
};

export const dayLabel = (date: string) => format(parseDate(date), "dd 'de' MMMM", {locale: ptBR});

export const money = (value: number) =>
  new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'}).format(value || 0);

export const formatMoneyInput = (value: string | number) => {
  const digits = String(value).replace(/\D/g, '');
  if (!digits) return '';
  return money(Number(digits) / 100);
};

export const parseMoney = (value: string | number) => {
  if (typeof value === 'number') return value;
  const normalized = value.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  return Number(normalized) || 0;
};

export const normalizeGanhos = (value: unknown): ValorResumo[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value as ValorResumo[];
  if (typeof value !== 'string') return [];
  try {
    return normalizeGanhos(JSON.parse(value));
  } catch {
    return [];
  }
};

export const serializeGanhos = (value: unknown) => JSON.stringify(normalizeGanhos(value));

export const expenseStatus = (paid: boolean, dueIso: string) => {
  if (paid) return 1;
  return toInputDate(dueIso) < format(new Date(), 'yyyy-MM-dd') ? 2 : 0;
};

export const nextExpenseStatus = (expense: Despesa) => {
  if (expense.status === 1) {
    return toInputDate(expense.vencimento) < format(new Date(), 'yyyy-MM-dd') ? 2 : 0;
  }
  return 1;
};

export const fixedDueDateForMonth = (sourceDueDate: string, targetMesId: string) => {
  const day = Number(toInputDate(sourceDueDate).slice(8, 10)) || 1;
  const [year, month] = targetMesId.split('-').map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return toIsoFromInputDate(`${targetMesId}-${String(Math.min(day, lastDay)).padStart(2, '0')}`);
};

export const addMonthsIso = (sourceIso: string, amount: number) =>
  addMonths(parseDate(sourceIso), amount).toISOString();

export const shortDate = (value: string | Date) =>
  format(typeof value === 'string' ? parseDate(value) : value, 'dd/MM/yyyy');
export const shortDayMonth = (value: string) => format(parseDate(value), 'dd/MM');
export const monthShort = (mesId: string) => format(parseDate(`${mesId}-01`), 'MMM/yy', {locale: ptBR});
export const dayNumber = (value: string) => Number(toInputDate(value).slice(8, 10));

export const daysInMonth = (mesId: string) => {
  const [year, month] = mesId.split('-').map(Number);
  return new Date(year, month, 0).getDate();
};

export const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
export const WEEKDAY_OPTIONS = [
  {value: 1, label: 'Seg'},
  {value: 2, label: 'Ter'},
  {value: 3, label: 'Qua'},
  {value: 4, label: 'Qui'},
  {value: 5, label: 'Sex'},
  {value: 6, label: 'Sab'},
  {value: 0, label: 'Dom'},
];

const clampDay = (day: number, mesId: string) =>
  Math.min(Math.max(Number(day) || 1, 1), daysInMonth(mesId));

const normalizeWeekdays = (weekdays?: number[] | null) =>
  Array.from(new Set((weekdays || []).map(Number).filter(day => day >= 0 && day <= 6)));

const weekdayForMonthlyDay = (gain: ValorResumo, mesId: string) => {
  const [year, month] = mesId.split('-').map(Number);
  return new Date(year, month - 1, clampDay(gain.dia_entrada || 1, mesId)).getDay();
};

export const diasDaEntradaNoMes = (gain: ValorResumo, mesId: string): number[] => {
  const recorrencia = gain.recorrencia || 'mensal';
  if (recorrencia === 'mensal') return [clampDay(gain.dia_entrada || 1, mesId)];
  if (recorrencia === 'diaria' && gain.recorrencia_diaria_modo === 'quantidade') {
    return [clampDay(gain.dia_entrada || 1, mesId)];
  }

  const weekdays = normalizeWeekdays(gain.dias_semana);
  const activeWeekdays = weekdays.length ? weekdays : [weekdayForMonthlyDay(gain, mesId)];
  const [year, month] = mesId.split('-').map(Number);
  const days: number[] = [];
  for (let day = 1; day <= daysInMonth(mesId); day += 1) {
    if (activeWeekdays.includes(new Date(year, month - 1, day).getDay())) days.push(day);
  }
  return days;
};

export const quantidadeOcorrenciasEntrada = (gain: ValorResumo, mesId: string) => {
  if (gain.recorrencia === 'diaria' && gain.recorrencia_diaria_modo === 'quantidade') {
    return Math.min(Math.max(Number(gain.quantidade_dias) || 0, 0), daysInMonth(mesId));
  }
  return diasDaEntradaNoMes(gain, mesId).length;
};

export const valorMensalEntrada = (gain: ValorResumo, mesId: string) =>
  (gain.valor || 0) * quantidadeOcorrenciasEntrada(gain, mesId);

export const movimentosEntradaNoMes = (gain: ValorResumo, mesId: string) => {
  if (gain.recorrencia === 'diaria' && gain.recorrencia_diaria_modo === 'quantidade') {
    return [{day: clampDay(gain.dia_entrada || 1, mesId), valor: valorMensalEntrada(gain, mesId)}];
  }
  return diasDaEntradaNoMes(gain, mesId).map(day => ({day, valor: gain.valor || 0}));
};

export const totalGanhosNoMes = (ganhos: ValorResumo[], mesId: string) =>
  ganhos.reduce((acc, item) => acc + valorMensalEntrada(item, mesId), 0);

/** Indice do primeiro dia do mês na grade que começa na segunda-feira. */
export const firstWeekdayOffset = (mesId: string) => {
  const [year, month] = mesId.split('-').map(Number);
  return (new Date(year, month - 1, 1).getDay() + 6) % 7;
};

export const isSameDayAsToday = (dateInput: string) => dateInput === format(new Date(), 'yyyy-MM-dd');

export const compactMoney = (value: number) => {
  const abs = Math.abs(value);
  if (abs >= 1000) return `${value < 0 ? '-' : ''}R$ ${(abs / 1000).toFixed(abs >= 10000 ? 0 : 1)}k`;
  return `${value < 0 ? '-' : ''}R$ ${Math.round(abs)}`;
};

export const initials = (name?: string | null, email?: string | null) => {
  const source = (name || email || 'U').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length > 1) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return source.slice(0, 1).toUpperCase();
};
