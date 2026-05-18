export type ValorResumo = {
  id: string;
  descricao: string;
  valor: number;
  dia_entrada?: number | null;
  last_update?: string;
  add_date?: string;
  logical_delete_date?: string | null;
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
};

export type DashboardData = {
  mes_info: Mes;
  categoria_despesas: CategoriaDespesa[];
  despesas: Despesa[];
};
