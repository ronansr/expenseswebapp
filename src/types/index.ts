export type OrigemEntrada = 'propria' | 'reembolso';

export type ValorResumo = {
  id: string;
  descricao: string;
  valor: number;
  dia_entrada?: number | null;
  last_update?: string;
  add_date?: string;
  logical_delete_date?: string | null;
  /** Quando é 'reembolso', a entrada devolve um gasto de terceiro e não conta como receita sua. */
  origem?: OrigemEntrada | null;
  /** Pessoa que está pagando o reembolso. Só faz sentido junto de origem 'reembolso'. */
  pessoa_id?: string | null;
};

export type UserData = {
  id: string;
  name?: string | null;
  email?: string | null;
  password?: string | null;
  image_profile?: string | null;
  extra_data?: string | null;
  last_update?: string | null;
  add_date?: string | null;
  account_status?: number | null;
  last_sync?: string | null;
  last_login?: string | null;
  logical_delete_date?: string | null;
  ganhos_mensais?: ValorResumo[] | string | null;
};

export type CategoriaDespesa = {
  id: string;
  add_date?: string | null;
  descricao: string;
  last_update?: string | null;
  last_sync?: string | null;
  informacao?: string | null;
  extra_data?: string | null;
  logical_delete_date?: string | null;
  user_id?: string | null;
};

export type Mes = {
  id: string;
  date?: string | null;
  total_ganhos: number;
  total_despesas: number;
  extra_data?: string | null;
  last_update?: string | null;
  add_date?: string | null;
  last_sync?: string | null;
  ganhos_mes: ValorResumo[] | string;
  logical_delete_date?: string | null;
  user_id?: string | null;
  unique_id?: string | null;
};

export type Despesa = {
  id: string;
  add_date?: string | null;
  vencimento: string;
  descricao: string;
  categoriaId: string;
  groupId?: string | null;
  parcela: number;
  totalParcelas: number;
  valor: number;
  status: number;
  last_update?: string | null;
  last_sync?: string | null;
  informacao?: string | null;
  extra_data?: string | null;
  mesId: string;
  mesUniqueid?: string | null;
  mesUniqueId?: string | null;
  despesa_fixa_id?: string | null;
  logical_delete_date?: string | null;
  /** Nulo significa que a despesa é sua. Preenchido, ela pertence a está pessoa. */
  pessoa_id?: string | null;
};

export type DashboardData = {
  mes_info: Mes;
  categoria_despesas: CategoriaDespesa[];
  despesas: Despesa[];
};

export type Pessoa = {
  id: string;
  user_id?: string | null;
  nome: string;
  informacao?: string | null;
  extra_data?: string | null;
  add_date?: string | null;
  last_update?: string | null;
  last_sync?: string | null;
  logical_delete_date?: string | null;
};

export type TipoMovimento = 'aporte' | 'resgate';

export type Meta = {
  id: string;
  user_id?: string | null;
  descricao: string;
  valor_alvo: number;
  aporte_mensal: number;
  data_alvo?: string | null;
  concluida?: boolean | null;
  informacao?: string | null;
  extra_data?: string | null;
  add_date?: string | null;
  last_update?: string | null;
  last_sync?: string | null;
  logical_delete_date?: string | null;
};

export type MetaMovimento = {
  id: string;
  user_id?: string | null;
  meta_id: string;
  mes_id: string;
  data: string;
  valor: number;
  tipo: TipoMovimento;
  informacao?: string | null;
  add_date?: string | null;
  last_update?: string | null;
  last_sync?: string | null;
  logical_delete_date?: string | null;
};

export type Reserva = {
  id: string;
  user_id?: string | null;
  objetivo: number;
  aporte_mensal: number;
  informacao?: string | null;
  extra_data?: string | null;
  add_date?: string | null;
  last_update?: string | null;
  last_sync?: string | null;
  logical_delete_date?: string | null;
};

export type ReservaMovimento = {
  id: string;
  user_id?: string | null;
  mes_id: string;
  data: string;
  valor: number;
  tipo: TipoMovimento;
  informacao?: string | null;
  add_date?: string | null;
  last_update?: string | null;
  last_sync?: string | null;
  logical_delete_date?: string | null;
};
