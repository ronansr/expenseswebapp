import type {Despesa, Mes, ValorResumo} from '../types';
import {addMonthsIso, fixedDueDateForMonth, toMesId, totalGanhosNoMes} from './format';
import {activeGains, isOwnExpense, isReimbursement} from './selectors';

/**
 * Projeção dos meses seguintes. Módulo puro: recebe o que já existe no banco e
 * devolve como o futuro fica se nada mudar.
 *
 * Nada aqui é gravado. As parcelas futuras já existem como linhas, porque
 * buildInstallments as cria de uma vez. As despesas fixas só existem até o mês
 * aberto, então elas são projetadas em memória, e a interface marca essas
 * ocorrências como estimativa.
 */

const proximoMes = (mesId: string) => {
  const [year, month] = mesId.split('-').map(Number);
  return month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, '0')}`;
};

export const mesesSeguintes = (mesId: string, quantidade: number) => {
  const lista: string[] = [];
  let atual = mesId;
  for (let index = 0; index < quantidade; index += 1) {
    atual = proximoMes(atual);
    lista.push(atual);
  }
  return lista;
};

export type MesProjetado = {
  mesId: string;
  /** Verdadeiro quando o mês ainda não aconteceu. */
  futuro: boolean;
  entradas: number;
  /** Despesas suas: parcelas já lançadas mais as fixas projetadas. */
  saidas: number;
  /** Quanto das saídas veio de parcelamento. */
  parcelas: number;
  /** Quanto das saídas veio de despesa fixa. */
  fixas: number;
  /** O que não é parcela nem fixa. Só aparece no passado e no mês aberto. */
  avulsas: number;
  saldo: number;
  /** Parcelamentos que terminam neste mês. */
  terminam: {descricao: string; valor: number; totalParcelas: number}[];
};

type Entrada = {
  meses: Mes[];
  despesas: Despesa[];
  /** Ganhos recorrentes do perfil, usados quando o mês futuro ainda não tem linha. */
  ganhosRecorrentes: ValorResumo[];
  mesAtual: string;
  horizonte: number;
};

/**
 * Série do passado até o horizonte pedido. O passado vem do que foi lançado, o
 * futuro vem do que já está comprometido: parcela que ainda vai vencer e conta
 * fixa que se repete.
 */
export const projetarMeses = ({
  meses,
  despesas,
  ganhosRecorrentes,
  mesAtual,
  horizonte,
}: Entrada): MesProjetado[] => {
  const proprias = despesas.filter(isOwnExpense);
  const porMes = new Map<string, Despesa[]>();
  proprias.forEach(item => porMes.set(item.mesId, [...(porMes.get(item.mesId) || []), item]));

  const mesPorId = new Map(meses.map(mes => [mes.id, mes]));
  const passados = meses
    .map(mes => mes.id)
    .filter(id => id <= mesAtual)
    .sort();
  const futuros = mesesSeguintes(mesAtual, horizonte);

  /* Última ocorrência de cada despesa fixa, para saber valor e dia do vencimento. */
  const fixasConhecidas = new Map<string, Despesa>();
  proprias
    .filter(item => item.despesa_fixa_id)
    .forEach(item => {
      const chave = item.despesa_fixa_id as string;
      const atual = fixasConhecidas.get(chave);
      if (!atual || item.mesId > atual.mesId) fixasConhecidas.set(chave, item);
    });

  const linha = (mesId: string, futuro: boolean): MesProjetado => {
    const doMes = porMes.get(mesId) || [];
    const jaTemFixa = new Set(doMes.filter(item => item.despesa_fixa_id).map(item => item.despesa_fixa_id));

    const parcelas = doMes
      .filter(item => item.totalParcelas > 1 && !item.despesa_fixa_id)
      .reduce((acc, item) => acc + item.valor, 0);
    const fixasLancadas = doMes
      .filter(item => item.despesa_fixa_id)
      .reduce((acc, item) => acc + item.valor, 0);
    const avulsas = doMes
      .filter(item => item.totalParcelas <= 1 && !item.despesa_fixa_id)
      .reduce((acc, item) => acc + item.valor, 0);

    /* Fixas sem linha neste mês: elas vão existir, só não foram criadas ainda. */
    const fixasProjetadas = futuro
      ? Array.from(fixasConhecidas.entries())
          .filter(([chave]) => !jaTemFixa.has(chave))
          .reduce((acc, [, referencia]) => acc + referencia.valor, 0)
      : 0;

    const mesRow = mesPorId.get(mesId);
    const ganhosDoMes = mesRow ? activeGains(mesRow.ganhos_mes).filter(item => !isReimbursement(item)) : [];
    const entradas = ganhosDoMes.length
      ? totalGanhosNoMes(ganhosDoMes, mesId)
      : totalGanhosNoMes(ganhosRecorrentes.filter(item => !isReimbursement(item)), mesId);

    const fixas = fixasLancadas + fixasProjetadas;
    /* No futuro, gasto avulso ainda não existe: só entra o que já está comprometido. */
    const saidas = futuro ? parcelas + fixas : parcelas + fixas + avulsas;

    const terminam = doMes
      .filter(item => item.totalParcelas > 1 && item.parcela === item.totalParcelas)
      .map(item => ({descricao: item.descricao, valor: item.valor, totalParcelas: item.totalParcelas}));

    return {
      mesId,
      futuro,
      entradas,
      saidas,
      parcelas,
      fixas,
      avulsas: futuro ? 0 : avulsas,
      saldo: entradas - saidas,
      terminam,
    };
  };

  return [...passados.map(mesId => linha(mesId, false)), ...futuros.map(mesId => linha(mesId, true))];
};

export type Alivio = {
  mesId: string;
  /** Quanto a conta do mês cai em relação ao mês anterior. */
  queda: number;
  /** Total comprometido depois da queda. */
  depois: number;
  /** O que terminou no mês anterior e causou a folga. */
  causas: {descricao: string; valor: number}[];
};

/** Ruído de centavos não é alívio. Abaixo disto a queda não vira marco. */
const QUEDA_MINIMA = 20;

/**
 * Os meses em que a conta realmente cai, e o que sai da conta em cada um. Uma
 * parcela que termina em março alivia abril, então o marco fica em abril e a
 * causa é a parcela de março.
 */
export const marcosDeAlivio = (serie: MesProjetado[]): Alivio[] => {
  const futuros = serie.filter(item => item.futuro);
  const marcos: Alivio[] = [];

  futuros.forEach((mes, index) => {
    const anterior = index === 0 ? serie.filter(item => !item.futuro).slice(-1)[0] : futuros[index - 1];
    if (!anterior) return;
    /* No mês aberto o avulso infla a comparação, então comparamos só o comprometido. */
    const base = anterior.futuro ? anterior.saidas : anterior.parcelas + anterior.fixas;
    const queda = base - mes.saidas;
    if (queda < QUEDA_MINIMA) return;
    marcos.push({
      mesId: mes.mesId,
      queda,
      depois: mes.saidas,
      causas: anterior.terminam.map(item => ({descricao: item.descricao, valor: item.valor})),
    });
  });

  return marcos;
};

export type ForecastResumo = {
  /** Média do que já está comprometido nos meses futuros. */
  comprometidoMedio: number;
  /** Pior mês do horizonte, o que precisa ser preparado com antecedência. */
  mesMaisPesado: MesProjetado | null;
  /** Primeiro mês em que a conta cai de verdade. */
  primeiroAlivio: Alivio | null;
  /** Total de parcelas que ainda vão vencer no horizonte. */
  parcelasAVencer: number;
  /** Meses futuros que fecham no vermelho. */
  mesesNegativos: MesProjetado[];
};

export const resumoProjecao = (serie: MesProjetado[]): ForecastResumo => {
  const futuros = serie.filter(item => item.futuro);
  const marcos = marcosDeAlivio(serie);
  return {
    comprometidoMedio: futuros.length
      ? futuros.reduce((acc, item) => acc + item.saidas, 0) / futuros.length
      : 0,
    mesMaisPesado: futuros.length
      ? futuros.reduce((pior, item) => (item.saidas > pior.saidas ? item : pior), futuros[0])
      : null,
    primeiroAlivio: marcos[0] || null,
    parcelasAVencer: futuros.reduce((acc, item) => acc + item.parcelas, 0),
    mesesNegativos: futuros.filter(item => item.saldo < 0),
  };
};

/** Mês em que a última parcela de um grupo vence, para dizer quando a compra acaba. */
export const fimDoParcelamento = (parcela: Despesa) =>
  toMesId(addMonthsIso(parcela.vencimento, parcela.totalParcelas - parcela.parcela));

/**
 * Próximas ocorrências de uma despesa fixa, projetadas a partir da última
 * conhecida. Serve para explicar de onde vem o valor fixo do mês futuro.
 */
export const projetarFixa = (referencia: Despesa, mesesAlvo: string[]): Despesa[] =>
  mesesAlvo.map(mesId => ({
    ...referencia,
    id: `${referencia.id}:${mesId}`,
    vencimento: fixedDueDateForMonth(referencia.vencimento, mesId),
    mesId,
  }));
