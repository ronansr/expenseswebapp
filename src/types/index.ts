export type OrigemEntrada = 'propria' | 'reembolso';
export type RecorrenciaEntrada = 'mensal' | 'semanal' | 'diaria';
export type RecorrenciaDiariaModo = 'dias_semana' | 'quantidade';

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
  /** Como o valor se repete dentro do mes. Ausente preserva o comportamento antigo: mensal. */
  recorrencia?: RecorrenciaEntrada | null;
  /** Dias da semana, 0 domingo ate 6 sabado. Usado em semanal e diaria por dias escolhidos. */
  dias_semana?: number[] | null;
  /** Para diaria por quantidade: quantos dias de recebimento existem no mes. */
  quantidade_dias?: number | null;
  /** Define se diaria usa dias da semana ou uma quantidade mensal informada. */
  recorrencia_diaria_modo?: RecorrenciaDiariaModo | null;
  /** Preenchido em memoria quando uma entrada vem do historico de meses. */
  mes_id?: string;
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
  /** Teto mensal de gasto. Zero desliga o alerta da categoria. */
  limite_mensal?: number | null;
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

export type TipoInvestimento = 'poupanca' | 'cdi' | 'selic' | 'prefixado' | 'ipca';

export type Investimento = {
  id: string;
  user_id?: string | null;
  /** Quando preenchido, o saldo desta aplicação conta como lastro da meta. */
  meta_id?: string | null;
  descricao: string;
  tipo: TipoInvestimento;
  /** Percentual do indexador, para cdi e selic. 110 significa 110% do CDI. */
  indice_percentual: number;
  /** Taxa em % ao ano. Inteira no prefixado, só o spread no ipca. */
  taxa_fixa: number;
  liquidez_diaria?: boolean | null;
  informacao?: string | null;
  extra_data?: string | null;
  add_date?: string | null;
  last_update?: string | null;
  last_sync?: string | null;
  logical_delete_date?: string | null;
};

export type InvestimentoMovimento = {
  id: string;
  user_id?: string | null;
  investimento_id: string;
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

/** Taxas de mercado, em % ao ano, exceto onde o nome diz o contrário. */
export type MarketRates = {
  /** CDI anualizado base 252, série SGS 4389. */
  cdi: number;
  /** Meta Selic definida pelo Copom, série SGS 432. */
  selic: number;
  /** Rendimento mensal da poupança, série SGS 195. Já em % ao mês. */
  poupancaMensal: number;
  /** IPCA dos últimos doze meses, montado com a série SGS 433. */
  ipca: number;
  /** Quando as taxas foram buscadas. */
  atualizadoEm: string;
  /** Verdadeiro quando a API do Banco Central respondeu. */
  aoVivo: boolean;
};
