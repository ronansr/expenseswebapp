import {differenceInCalendarDays} from 'date-fns';
import type {Investimento, InvestimentoMovimento, MarketRates, TipoInvestimento} from '../types';
import {daysInMonth, parseDate, toMesId} from './format';

/**
 * Matematica de rendimento. Modulo puro: recebe movimentos e taxas, devolve
 * numeros. Nao busca nada e nao grava nada, igual ao selectors.
 *
 * O rendimento nunca vai para o banco. Ele e sempre derivado do tempo que cada
 * aporte passou aplicado, para que uma mudanca de taxa recalcule o passado
 * inteiro sem migracao de dados.
 */

/** Dias uteis por ano usados pelo mercado brasileiro para CDI e Selic. */
const DIAS_UTEIS_ANO = 252;
/** Proporcao media de dias uteis em um dia corrido. */
const FATOR_UTIL = DIAS_UTEIS_ANO / 365;

export const TIPO_LABEL: Record<TipoInvestimento, string> = {
  poupanca: 'Poupança',
  cdi: 'CDI',
  selic: 'Selic',
  prefixado: 'Prefixado',
  ipca: 'IPCA mais taxa',
};

/**
 * Taxas de referencia usadas quando a API do Banco Central nao responde. Sao o
 * ultimo patamar conhecido, e a interface diz na cara que os numeros nao vieram
 * ao vivo, para ninguem confundir estimativa com extrato.
 */
export const FALLBACK_RATES: MarketRates = {
  cdi: 14.9,
  selic: 15,
  poupancaMensal: 0.6604,
  ipca: 4.5,
  atualizadoEm: '',
  aoVivo: false,
};

/** Taxa efetiva anual da aplicacao, em porcentagem, dado o cenario de mercado. */
export const taxaAnual = (investimento: Investimento, rates: MarketRates): number => {
  const percentual = (investimento.indice_percentual || 0) / 100;
  switch (investimento.tipo) {
    case 'poupanca':
      /* A poupanca rende ao mes. Capitalizamos doze meses para comparar com o resto. */
      return (Math.pow(1 + (rates.poupancaMensal || 0) / 100, 12) - 1) * 100;
    case 'cdi':
      return (rates.cdi || 0) * percentual;
    case 'selic':
      return (rates.selic || 0) * percentual;
    case 'prefixado':
      return investimento.taxa_fixa || 0;
    case 'ipca':
      /* Juro real sobre a inflacao, composto, e nao a soma simples dos dois. */
      return ((1 + (rates.ipca || 0) / 100) * (1 + (investimento.taxa_fixa || 0) / 100) - 1) * 100;
    default:
      return 0;
  }
};

/**
 * Fator de correcao de um aporte que ficou `dias` corridos aplicado.
 * CDI e Selic capitalizam em dias uteis, os demais em dias corridos.
 */
const fatorPeriodo = (taxaAnualPercent: number, dias: number, baseUtil: boolean) => {
  if (dias <= 0) return 1;
  const taxa = taxaAnualPercent / 100;
  if (taxa <= -1) return 1;
  const expoente = baseUtil ? (dias * FATOR_UTIL) / DIAS_UTEIS_ANO : dias / 365;
  return Math.pow(1 + taxa, expoente);
};

const usaDiaUtil = (tipo: TipoInvestimento) => tipo === 'cdi' || tipo === 'selic';

/**
 * Tabela regressiva do imposto de renda sobre renda fixa. O imposto incide só
 * sobre o rendimento, nunca sobre o que voce aplicou, e a aliquota cai conforme
 * o dinheiro fica parado.
 *
 * O IOF dos primeiros trinta dias fica de fora de proposito: ele so existe em
 * um resgate muito curto, e neste primeiro mes o rendimento e pequeno demais
 * para mudar decisao nenhuma. Errar aqui custaria centavos e complicaria a
 * leitura de todos os outros meses.
 */
export const FAIXAS_IR = [
  {ate: 180, percentual: 22.5},
  {ate: 360, percentual: 20},
  {ate: 720, percentual: 17.5},
  {ate: Infinity, percentual: 15},
];

export const aliquotaIr = (dias: number) =>
  FAIXAS_IR.find(faixa => dias <= faixa.ate)?.percentual ?? 15;

/** Poupanca e isenta por lei. LCI, LCA e afins sao isentas por marcacao. */
export const pagaIr = (investimento: Investimento) =>
  investimento.tipo !== 'poupanca' && !investimento.isento_ir;

/**
 * Ate onde a carteira e olhada quando voce muda de mes. No mes corrente a
 * resposta e hoje, porque e o unico numero que existe de verdade. Em qualquer
 * outro mes e o ultimo dia dele: no passado isso e a posicao no fechamento, no
 * futuro e projecao, e a tela precisa dizer qual dos dois esta mostrando.
 */
export const referenciaDoMes = (mesId: string, hoje = new Date()) => {
  if (mesId === toMesId(hoje)) return hoje;
  /* Fim do ultimo dia, para o movimento feito naquele dia entrar na conta. */
  const ultimo = String(daysInMonth(mesId)).padStart(2, '0');
  return new Date(`${mesId}-${ultimo}T23:59:59`);
};

/** Verdadeiro quando o mes escolhido ainda nao aconteceu. */
export const mesNoFuturo = (mesId: string, hoje = new Date()) => mesId > toMesId(hoje);

export type InvestimentoPosicao = {
  investimento: Investimento;
  /** Soma dos aportes menos os resgates, sem rendimento. */
  aplicado: number;
  /** Aplicado mais o rendimento acumulado ate a data de referencia. */
  bruto: number;
  rendimento: number;
  /** Imposto devido se o resgate acontecesse na data de referencia. */
  ir: number;
  /** Aliquota media sobre o rendimento, em porcentagem. Zero quando isenta. */
  aliquotaEfetiva: number;
  /** O que sobra na mao depois do imposto. */
  liquido: number;
  rendimentoLiquido: number;
  isenta: boolean;
  /** Taxa efetiva ao ano usada no calculo, em porcentagem. */
  taxaAoAno: number;
  /** Quanto essa aplicacao rende por mes no patamar atual. */
  rendimentoMensalEstimado: number;
  /** Todos os movimentos da aplicacao, inclusive os posteriores a referencia. */
  movimentos: InvestimentoMovimento[];
  /** Quantos movimentos entraram na conta ate a data de referencia. */
  consideradas: number;
  /** Ate quando a carteira foi olhada. */
  referencia: Date;
  primeiroAporte: string | null;
};

/**
 * Posicao de uma aplicacao em uma data. Cada movimento e corrigido do proprio
 * dia ate a referencia: um aporte feito ontem nao pode render como se estivesse
 * la desde janeiro. Resgates entram negativos e param de render a partir da data
 * do saque.
 *
 * Movimento posterior a referencia nao conta. Olhar janeiro nao pode enxergar
 * dinheiro que so foi aplicado em marco.
 *
 * O imposto e calculado lote a lote, porque a aliquota depende do tempo de cada
 * aporte: cem reais parados ha dois anos pagam quinze por cento enquanto cem
 * reais do mes passado pagam vinte e dois e meio.
 */
export const posicaoInvestimento = (
  investimento: Investimento,
  movimentos: InvestimentoMovimento[],
  rates: MarketRates,
  referencia = new Date(),
): InvestimentoPosicao => {
  const doInvestimento = movimentos
    .filter(item => item.investimento_id === investimento.id)
    .sort((a, b) => a.data.localeCompare(b.data));
  const ateAqui = doInvestimento.filter(
    item => parseDate(item.data).getTime() <= referencia.getTime(),
  );
  const taxaAoAno = taxaAnual(investimento, rates);
  const baseUtil = usaDiaUtil(investimento.tipo);
  const tributada = pagaIr(investimento);

  let aplicado = 0;
  let bruto = 0;
  let imposto = 0;
  ateAqui.forEach(movimento => {
    const sinal = movimento.tipo === 'resgate' ? -1 : 1;
    const valor = sinal * (movimento.valor || 0);
    const dias = Math.max(differenceInCalendarDays(referencia, parseDate(movimento.data)), 0);
    const fator = fatorPeriodo(taxaAoAno, dias, baseUtil);
    aplicado += valor;
    bruto += valor * fator;
    if (tributada) imposto += valor * (fator - 1) * (aliquotaIr(dias) / 100);
  });

  /* Um resgate maior que o aplicado nao existe: o piso e zero nos dois numeros. */
  aplicado = Math.max(aplicado, 0);
  bruto = Math.max(bruto, 0);
  const rendimento = bruto - aplicado;
  /* Imposto sobre prejuizo nao existe, e ele nunca passa do proprio rendimento. */
  const ir = Math.min(Math.max(imposto, 0), Math.max(rendimento, 0));

  return {
    investimento,
    aplicado,
    bruto,
    rendimento,
    ir,
    aliquotaEfetiva: rendimento > 0 ? (ir / rendimento) * 100 : 0,
    liquido: bruto - ir,
    rendimentoLiquido: rendimento - ir,
    isenta: !tributada,
    taxaAoAno,
    rendimentoMensalEstimado: bruto * (Math.pow(1 + taxaAoAno / 100, 1 / 12) - 1),
    movimentos: doInvestimento,
    consideradas: ateAqui.length,
    referencia,
    primeiroAporte: ateAqui[0]?.data || null,
  };
};

export const posicoesInvestimento = (
  investimentos: Investimento[],
  movimentos: InvestimentoMovimento[],
  rates: MarketRates,
  referencia = new Date(),
): InvestimentoPosicao[] =>
  investimentos.map(item => posicaoInvestimento(item, movimentos, rates, referencia));

export type CarteiraResumo = {
  aplicado: number;
  bruto: number;
  rendimento: number;
  ir: number;
  liquido: number;
  rendimentoLiquido: number;
  rendimentoMensalEstimado: number;
  /** Rentabilidade acumulada sobre o que foi aplicado, em porcentagem. */
  rentabilidade: number;
  /** Rentabilidade ja descontado o imposto, que e a que voce leva para casa. */
  rentabilidadeLiquida: number;
};

export const resumoCarteira = (posicoes: InvestimentoPosicao[]): CarteiraResumo => {
  const aplicado = posicoes.reduce((acc, item) => acc + item.aplicado, 0);
  const bruto = posicoes.reduce((acc, item) => acc + item.bruto, 0);
  const ir = posicoes.reduce((acc, item) => acc + item.ir, 0);
  const rendimentoMensalEstimado = posicoes.reduce((acc, item) => acc + item.rendimentoMensalEstimado, 0);
  const rendimento = bruto - aplicado;
  return {
    aplicado,
    bruto,
    rendimento,
    ir,
    liquido: bruto - ir,
    rendimentoLiquido: rendimento - ir,
    rendimentoMensalEstimado,
    rentabilidade: aplicado > 0 ? (rendimento / aplicado) * 100 : 0,
    rentabilidadeLiquida: aplicado > 0 ? ((rendimento - ir) / aplicado) * 100 : 0,
  };
};

/**
 * Quantos meses faltam para o saldo investido, rendendo e recebendo o aporte
 * mensal, alcancar o alvo. Devolve nulo quando o alvo nao chega em 50 anos, que
 * na pratica quer dizer "com esse aporte, nunca".
 */
export const mesesParaAlvo = (
  saldoAtual: number,
  alvo: number,
  aporteMensal: number,
  taxaAoAno: number,
): number | null => {
  if (saldoAtual >= alvo) return 0;
  if (aporteMensal <= 0 && taxaAoAno <= 0) return null;
  const taxaMensal = Math.pow(1 + taxaAoAno / 100, 1 / 12) - 1;
  let saldo = saldoAtual;
  for (let mes = 1; mes <= 600; mes += 1) {
    saldo = saldo * (1 + taxaMensal) + aporteMensal;
    if (saldo >= alvo) return mes;
  }
  return null;
};

/** Taxa media da carteira, ponderada pelo valor bruto de cada aplicacao. */
export const taxaMediaCarteira = (posicoes: InvestimentoPosicao[]) => {
  const bruto = posicoes.reduce((acc, item) => acc + item.bruto, 0);
  if (bruto <= 0) return 0;
  return posicoes.reduce((acc, item) => acc + item.taxaAoAno * item.bruto, 0) / bruto;
};
