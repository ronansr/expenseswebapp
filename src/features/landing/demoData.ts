import type {CategorySlice, DayFlow} from '../../lib/selectors';

/**
 * Serie de demonstracao da landing. Numeros irregulares de proposito: uma
 * curva redonda demais não se parece com o mês de ninguém.
 */
export const DEMO_FLOW: DayFlow[] = [
  {day: 1, entradas: 0, saidas: 128.4, saldo: -128.4},
  {day: 2, entradas: 0, saidas: 62.9, saldo: -191.3},
  {day: 3, entradas: 0, saidas: 240.15, saldo: -431.45},
  {day: 4, entradas: 0, saidas: 47.8, saldo: -479.25},
  {day: 5, entradas: 4820, saidas: 1284.6, saldo: 3056.15},
  {day: 6, entradas: 0, saidas: 96.2, saldo: 2959.95},
  {day: 7, entradas: 0, saidas: 312.45, saldo: 2647.5},
  {day: 8, entradas: 0, saidas: 58.9, saldo: 2588.6},
  {day: 9, entradas: 0, saidas: 174.3, saldo: 2414.3},
  {day: 10, entradas: 1260, saidas: 402.75, saldo: 3271.55},
  {day: 11, entradas: 0, saidas: 89.4, saldo: 3182.15},
  {day: 12, entradas: 0, saidas: 231.6, saldo: 2950.55},
  {day: 13, entradas: 0, saidas: 44.2, saldo: 2906.35},
  {day: 14, entradas: 0, saidas: 168.9, saldo: 2737.45},
  {day: 15, entradas: 980, saidas: 526.3, saldo: 3191.15},
  {day: 16, entradas: 0, saidas: 72.85, saldo: 3118.3},
  {day: 17, entradas: 0, saidas: 143.2, saldo: 2975.1},
  {day: 18, entradas: 0, saidas: 289.65, saldo: 2685.45},
  {day: 19, entradas: 0, saidas: 51.7, saldo: 2633.75},
  {day: 20, entradas: 640, saidas: 384.9, saldo: 2888.85},
  {day: 21, entradas: 0, saidas: 118.35, saldo: 2770.5},
  {day: 22, entradas: 0, saidas: 205.4, saldo: 2565.1},
  {day: 23, entradas: 0, saidas: 67.25, saldo: 2497.85},
  {day: 24, entradas: 0, saidas: 156.8, saldo: 2341.05},
  {day: 25, entradas: 0, saidas: 428.6, saldo: 1912.45},
  {day: 26, entradas: 0, saidas: 93.15, saldo: 1819.3},
  {day: 27, entradas: 0, saidas: 261.5, saldo: 1557.8},
  {day: 28, entradas: 0, saidas: 74.9, saldo: 1482.9},
  {day: 29, entradas: 0, saidas: 187.35, saldo: 1295.55},
  {day: 30, entradas: 0, saidas: 132.6, saldo: 1162.95},
];

export const DEMO_CATEGORIES: CategorySlice[] = [
  {id: 'moradia', label: 'Moradia', total: 1687.4, count: 4, share: 0.386},
  {id: 'mercado', label: 'Mercado', total: 842.15, count: 11, share: 0.193},
  {id: 'transporte', label: 'Transporte', total: 613.7, count: 9, share: 0.14},
  {id: 'alimentacao', label: 'Alimentacao', total: 508.35, count: 14, share: 0.116},
  {id: 'educacao', label: 'Educacao', total: 389, count: 2, share: 0.089},
  {id: 'saude', label: 'Saude', total: 331.85, count: 3, share: 0.076},
];

export const DEMO_TOTAL = DEMO_CATEGORIES.reduce((acc, item) => acc + item.total, 0);
