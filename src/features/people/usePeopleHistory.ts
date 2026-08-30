import {useEffect, useState} from 'react';
import {expenseService, monthService} from '../../services';
import type {Despesa, ValorResumo} from '../../types';
import {activeGains} from '../../lib/selectors';
import {errorMessage} from '../../lib/errors';

/**
 * Dívida de terceiro não cabe em um mês só: uma compra parcelada em dez vezes
 * atravessa o ano. Aqui juntamos todos os meses para saber o saldo real.
 */
export const usePeopleHistory = (version: number) => {
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [ganhos, setGanhos] = useState<ValorResumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    (async () => {
      try {
        const meses = await monthService.list();
        const todas = await expenseService.listByMonths(meses);
        if (!active) return;
        setDespesas(todas);
        setGanhos(meses.flatMap(mes => activeGains(mes.ganhos_mes)));
      } catch (err) {
        if (active) setError(errorMessage(err, 'Não foi possível carregar o histórico.'));
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [version]);

  return {despesas, ganhos, loading, error};
};
