import type {MarketRates} from '../types';
import {FALLBACK_RATES} from '../lib/investments';

/**
 * Taxas de mercado vindas do SGS, o sistema de series temporais do Banco
 * Central. A API e publica, aberta a navegador e nao pede chave.
 *
 * Series usadas:
 *   4389  CDI anualizado base 252, em % ao ano
 *    432  Meta Selic definida pelo Copom, em % ao ano
 *    195  Rendimento mensal da poupanca, em % ao mes
 *    433  IPCA mensal, em % ao mes (juntamos doze meses)
 *
 * A rede pode falhar, e o Banco Central sai do ar de madrugada. Quando isso
 * acontece devolvemos o ultimo valor guardado, e so em ultimo caso o patamar de
 * referencia do codigo. Em todos os casos `aoVivo` diz de onde veio o numero,
 * porque estimativa e extrato nao podem parecer a mesma coisa na tela.
 */

const BASE = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs';
const CACHE_KEY = 'sobcontrole:taxas';
/* Selic e CDI mudam no maximo uma vez por dia util. Meia jornada de cache basta. */
const CACHE_TTL = 12 * 60 * 60 * 1000;
const TIMEOUT = 6000;

type Cache = {rates: MarketRates; salvoEm: number};

const ultimos = async (serie: number, quantidade: number, signal: AbortSignal): Promise<number[]> => {
  const url = `${BASE}.${serie}/dados/ultimos/${quantidade}?formato=json`;
  const response = await fetch(url, {signal, headers: {Accept: 'application/json'}});
  if (!response.ok) throw new Error(`Série ${serie} respondeu ${response.status}.`);
  const rows = (await response.json()) as Array<{data: string; valor: string}>;
  return rows.map(row => Number(String(row.valor).replace(',', '.'))).filter(Number.isFinite);
};

const lerCache = (): Cache | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Cache) : null;
  } catch {
    return null;
  }
};

const gravarCache = (rates: MarketRates) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({rates, salvoEm: Date.now()} satisfies Cache));
  } catch {
    /* Navegador em aba privada ou sem espaco. O app segue com a taxa em memoria. */
  }
};

export const ratesService = {
  /** Ultimo valor guardado, sem rede. Serve para pintar a tela antes da resposta. */
  cached(): MarketRates {
    return lerCache()?.rates || FALLBACK_RATES;
  },

  async get(force = false): Promise<MarketRates> {
    const cache = lerCache();
    if (!force && cache && Date.now() - cache.salvoEm < CACHE_TTL && cache.rates.aoVivo) {
      return cache.rates;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT);
    try {
      const [cdi, selic, poupanca, ipca] = await Promise.all([
        ultimos(4389, 1, controller.signal),
        ultimos(432, 1, controller.signal),
        ultimos(195, 1, controller.signal),
        ultimos(433, 12, controller.signal),
      ]);

      const base = cache?.rates || FALLBACK_RATES;
      /* IPCA cheio do periodo: os doze meses compostos, nao somados. */
      const ipcaDozeMeses = ipca.length
        ? (ipca.reduce((acc, mes) => acc * (1 + mes / 100), 1) - 1) * 100
        : base.ipca;

      const rates: MarketRates = {
        cdi: cdi[0] ?? base.cdi,
        selic: selic[0] ?? base.selic,
        poupancaMensal: poupanca[0] ?? base.poupancaMensal,
        ipca: ipcaDozeMeses,
        atualizadoEm: new Date().toISOString(),
        aoVivo: true,
      };
      gravarCache(rates);
      return rates;
    } catch {
      /* Sem rede, o ultimo valor conhecido vale mais que o patamar do codigo. */
      if (cache) return {...cache.rates, aoVivo: false};
      return FALLBACK_RATES;
    } finally {
      clearTimeout(timer);
    }
  },
};
