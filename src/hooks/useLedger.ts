import {useCallback, useEffect, useState} from 'react';
import {metaService, pessoaService, reservaService} from '../services';
import type {Meta, MetaMovimento, Pessoa, Reserva, ReservaMovimento} from '../types';
import {errorMessage} from '../lib/errors';

export type LedgerState = {
  pessoas: Pessoa[];
  metas: Meta[];
  metaMovimentos: MetaMovimento[];
  reserva: Reserva | null;
  reservaMovimentos: ReservaMovimento[];
  loading: boolean;
  error: string;
  reload: () => Promise<void>;
};

/**
 * Pessoas, metas e reserva vivem fora do mês: o saldo de uma meta é a soma de
 * todos os aportes, não só os deste mês. Por isso carregamos tudo de uma vez e
 * recarregamos só quando algo muda.
 */
export const useLedger = (enabled: boolean): LedgerState => {
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [metas, setMetas] = useState<Meta[]>([]);
  const [metaMovimentos, setMetaMovimentos] = useState<MetaMovimento[]>([]);
  const [reserva, setReserva] = useState<Reserva | null>(null);
  const [reservaMovimentos, setReservaMovimentos] = useState<ReservaMovimento[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [listaPessoas, listaMetas, movimentosMeta, caixa, movimentosReserva] = await Promise.all([
        pessoaService.list(),
        metaService.list(),
        metaService.listMovimentos(),
        reservaService.ensure(),
        reservaService.listMovimentos(),
      ]);
      setPessoas(listaPessoas);
      setMetas(listaMetas);
      setMetaMovimentos(movimentosMeta);
      setReserva(caixa);
      setReservaMovimentos(movimentosReserva);
    } catch (err) {
      console.error('Erro ao carregar metas, pessoas e reserva:', err);
      setError(errorMessage(err, 'Não foi possível carregar metas, pessoas e reserva.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) load();
  }, [enabled, load]);

  return {pessoas, metas, metaMovimentos, reserva, reservaMovimentos, loading, error, reload: load};
};
