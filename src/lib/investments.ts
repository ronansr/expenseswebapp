import {differenceInCalendarDays} from 'date-fns';
import type {Investimento, InvestimentoMovimento, MarketRates, TipoInvestimento} from '../types';
import {parseDate} from './format';

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

export type InvestimentoPosicao = {
  investimento: Investimento;
  /** Soma dos aportes menos os resgates, sem rendimento. */
  aplicado: number;
  /** Aplicado mais o rendimento acumulado ate hoje. */
  bruto: number;
  rendimento: number;
  /** Taxa efetiva ao ano usada no calculo, em porcentagem. */
  taxaAoAno: number;
  /** Quanto essa aplicacao rende por mes no patamar atual. */
  rendimentoMensalEstimado: number;
  movimentos: InvestimentoMovimento[];
  primeiroAporte: string | null;
};

/**
 * Posicao de uma aplicacao. Cada movimento e corrigido do proprio dia ate hoje:
 * um aporte feito ontem nao pode render como se estivesse la desde janeiro.
 * Resgates entram negativos e param de render a partir da data do saque.
 */
export const posicaoInvestimento = (
  investimento: Investimento,
  movimentos: InvestimentoMovimento[],
  rates: MarketRates,
  hoje = new Date(),
): InvestimentoPosicao => {
  const doInvestimento = movimentos
    .filter(item => item.investimento_id === investimento.id)
    .sort((a, b) => a.data.localeCompare(b.data));
  const taxaAoAno = taxaAnual(investimento, rates);
  const baseUtil = usaDiaUtil(investimento.tipo);

  let aplicado = 0;
  let bruto = 0;
  doInvestimento.forEach(movimento => {
    const sinal = movimento.tipo === 'resgate' ? -1 : 1;
    const valor = sinal * (movimento.valor || 0);
    const dias = Math.max(differenceInCalendarDays(hoje, parseDate(movimento.data)), 0);
    aplicado += valor;
    bruto += valor * fatorPeriodo(taxaAoAno, dias, baseUtil);
  });

  /* Um resgate maior que o aplicado nao existe: o piso e zero nos dois numeros. */
  aplicado = Math.max(aplicado, 0);
  bruto = Math.max(bruto, 0);

  return {
    investimento,
    aplicado,
    bruto,
    rendimento: bruto - aplicado,
    taxaAoAno,
    rendimentoMensalEstimado: bruto * (Math.pow(1 + taxaAoAno / 100, 1 / 12) - 1),
    movimentos: doInvestimento,
    primeiroAporte: doInvestimento[0]?.data || null,
  };
};

export const posicoesInvestimento = (
  investimentos: Investimento[],
  movimentos: InvestimentoMovimento[],
  rates: MarketRates,
  hoje = new Date(),
): InvestimentoPosicao[] =>
  investimentos.map(item => posicaoInvestimento(item, movimentos, rates, hoje));

export type CarteiraResumo = {
  aplicado: number;
  bruto: number;
  rendimento: number;
  rendimentoMensalEstimado: number;
  /** Rentabilidade acumulada sobre o que foi aplicado, em porcentagem. */
  rentabilidade: number;
};

export const resumoCarteira = (posicoes: InvestimentoPosicao[]): CarteiraResumo => {
  const aplicado = posicoes.reduce((acc, item) => acc + item.aplicado, 0);
  const bruto = posicoes.reduce((acc, item) => acc + item.bruto, 0);
  const rendimentoMensalEstimado = posicoes.reduce((acc, item) => acc + item.rendimentoMensalEstimado, 0);
  return {
    aplicado,
    bruto,
    rendimento: bruto - aplicado,
    rendimentoMensalEstimado,
    rentabilidade: aplicado > 0 ? ((bruto - aplicado) / aplicado) * 100 : 0,
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
