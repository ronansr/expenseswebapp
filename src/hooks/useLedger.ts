import {useCallback, useEffect, useState} from 'react';
import {investimentoService, metaService, pessoaService, reservaService} from '../services';
import {ratesService} from '../services/rates';
import type {
  Investimento,
  InvestimentoMovimento,
  MarketRates,
  Meta,
  MetaMovimento,
  Pessoa,
  Reserva,
  ReservaMovimento,
} from '../types';
import {errorMessage} from '../lib/errors';

export type LedgerState = {
  pessoas: Pessoa[];
  metas: Meta[];
  metaMovimentos: MetaMovimento[];
  reserva: Reserva | null;
  reservaMovimentos: ReservaMovimento[];
  investimentos: Investimento[];
  investimentoMovimentos: InvestimentoMovimento[];
  /** Taxas de mercado do Banco Central. Nunca nulo: cai no último valor conhecido. */
  rates: MarketRates;
  ratesLoading: boolean;
  refreshRates: () => Promise<void>;
  loading: boolean;
  error: string;
  reload: () => Promise<void>;
};

/**
 * Pessoas, metas, reserva e investimentos vivem fora do mês: o saldo de uma meta
 * é a soma de todos os aportes, não só os deste mês. Por isso carregamos tudo de
 * uma vez e recarregamos só quando algo muda.
 *
 * As taxas de mercado seguem por fora do `loading` da lista, porque elas vêm de
 * uma API externa: a carteira aparece na hora, e a taxa se acerta quando chega.
 */
export const useLedger = (enabled: boolean): LedgerState => {
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [metas, setMetas] = useState<Meta[]>([]);
  const [metaMovimentos, setMetaMovimentos] = useState<MetaMovimento[]>([]);
  const [reserva, setReserva] = useState<Reserva | null>(null);
  const [reservaMovimentos, setReservaMovimentos] = useState<ReservaMovimento[]>([]);
  const [investimentos, setInvestimentos] = useState<Investimento[]>([]);
  const [investimentoMovimentos, setInvestimentoMovimentos] = useState<InvestimentoMovimento[]>([]);
  const [rates, setRates] = useState<MarketRates>(() => ratesService.cached());
  const [ratesLoading, setRatesLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [
        listaPessoas,
        listaMetas,
        movimentosMeta,
        caixa,
        movimentosReserva,
        listaInvestimentos,
        movimentosInvestimento,
      ] = await Promise.all([
        pessoaService.list(),
        metaService.list(),
        metaService.listMovimentos(),
        reservaService.ensure(),
        reservaService.listMovimentos(),
        /*
         * As tabelas de investimento chegaram na migração 002. Enquanto ela não
         * roda, a carteira fica vazia em vez de derrubar metas e reserva junto.
         */
        investimentoService.list().catch(() => [] as Investimento[]),
        investimentoService.listMovimentos().catch(() => [] as InvestimentoMovimento[]),
      ]);
      setPessoas(listaPessoas);
      setMetas(listaMetas);
      setMetaMovimentos(movimentosMeta);
      setReserva(caixa);
      setReservaMovimentos(movimentosReserva);
      setInvestimentos(listaInvestimentos);
      setInvestimentoMovimentos(movimentosInvestimento);
    } catch (err) {
      console.error('Erro ao carregar metas, pessoas, reserva e investimentos:', err);
      setError(errorMessage(err, 'Não foi possível carregar metas, pessoas e reserva.'));
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshRates = useCallback(async (force = true) => {
    setRatesLoading(true);
    try {
      setRates(await ratesService.get(force));
    } finally {
      setRatesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) load();
  }, [enabled, load]);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    setRatesLoading(true);
    ratesService
      .get()
      .then(next => active && setRates(next))
      .finally(() => active && setRatesLoading(false));
    return () => {
      active = false;
    };
  }, [enabled]);

  return {
    pessoas,
    metas,
    metaMovimentos,
    reserva,
    reservaMovimentos,
    investimentos,
    investimentoMovimentos,
    rates,
    ratesLoading,
    refreshRates: () => refreshRates(true),
    loading,
    error,
    reload: load,
  };
};
