import {
  BarChart3,
  CalendarDays,
  LayoutDashboard,
  Layers,
  LifeBuoy,
  LineChart,
  Receipt,
  Repeat,
  Settings,
  Tags,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import type {LucideIcon} from 'lucide-react';

export type ViewId =
  | 'overview'
  | 'calendar'
  | 'expenses'
  | 'income'
  | 'recurring'
  | 'installments'
  | 'goals'
  | 'investments'
  | 'reserve'
  | 'people'
  | 'categories'
  | 'reports'
  | 'profile';

export type NavEntry = {id: ViewId; label: string; icon: LucideIcon};

export type NavGroup = {label: string; items: NavEntry[]};

/** A navegação cresceu, então ela vai agrupada. Cada grupo é uma pergunta diferente. */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'O mês',
    items: [
      {id: 'overview', label: 'Visão geral', icon: LayoutDashboard},
      {id: 'calendar', label: 'Calendário', icon: CalendarDays},
      {id: 'expenses', label: 'Despesas', icon: Receipt},
      {id: 'income', label: 'Receitas', icon: TrendingUp},
    ],
  },
  {
    label: 'Compromissos',
    items: [
      {id: 'recurring', label: 'Recorrentes', icon: Repeat},
      {id: 'installments', label: 'Parcelas', icon: Layers},
    ],
  },
  {
    label: 'Planejamento',
    items: [
      {id: 'goals', label: 'Metas', icon: Target},
      {id: 'investments', label: 'Investimentos', icon: LineChart},
      {id: 'reserve', label: 'Reserva', icon: LifeBuoy},
    ],
  },
  {
    label: 'Cadastros',
    items: [
      {id: 'people', label: 'Pessoas', icon: Users},
      {id: 'categories', label: 'Categorias', icon: Tags},
      {id: 'reports', label: 'Relatórios', icon: BarChart3},
      {id: 'profile', label: 'Configurações', icon: Settings},
    ],
  },
];

export const NAV_ITEMS: NavEntry[] = NAV_GROUPS.flatMap(group => group.items);

/** As quatro abas do rodapé no celular. A quinta posição é o botão de lançamento. */
export const TAB_ITEMS: NavEntry[] = [
  {id: 'overview', label: 'Início', icon: LayoutDashboard},
  {id: 'calendar', label: 'Calendário', icon: CalendarDays},
  {id: 'expenses', label: 'Despesas', icon: Receipt},
];

export const VIEW_TITLES: Record<ViewId, string> = {
  overview: 'Visão geral',
  calendar: 'Calendário',
  expenses: 'Despesas',
  income: 'Receitas',
  recurring: 'Despesas recorrentes',
  installments: 'Parcelas',
  goals: 'Metas',
  investments: 'Investimentos',
  reserve: 'Reserva de emergência',
  people: 'Pessoas',
  categories: 'Categorias',
  reports: 'Relatórios',
  profile: 'Configurações',
};
