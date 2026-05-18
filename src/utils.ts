import {addMonths, format, isValid, parseISO} from 'date-fns';
import {ptBR} from 'date-fns/locale';
import type {Despesa, ValorResumo} from './types';

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
