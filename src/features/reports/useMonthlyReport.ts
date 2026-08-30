import {useEffect, useState} from 'react';
import {expenseService, monthService} from '../../services';
import type {Mes} from '../../types';
import {activeGains} from '../../lib/selectors';
import {errorMessage} from '../../lib/errors';

export type MonthReport = {
  mesId: string;
  entradas: number;
  saidas: number;
  pagas: number;
  saldo: number;
};

const WINDOW = 6;

/**
 * Serie dos últimos meses, montada com os mesmos servicos já existentes:
 * monthService.list para os meses e expenseService.listByMonths para as despesas.
 */
export const useMonthlyReport = (mesIdFinal: string) => {
  const [data, setData] = useState<MonthReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    (async () => {
      try {
        const meses: Mes[] = (await monthService.list())
          .filter(mes => mes.id <= mesIdFinal)
          .sort((a, b) => a.id.localeCompare(b.id))
          .slice(-WINDOW);
        const despesas = await expenseService.listByMonths(meses);
        if (!active) return;

        setData(
          meses.map(mes => {
            const doMes = despesas.filter(item => item.mesId === mes.id);
            const saidas = doMes.reduce((acc, item) => acc + item.valor, 0);
            const pagas = doMes.filter(item => item.status === 1).reduce((acc, item) => acc + item.valor, 0);
            const entradas = activeGains(mes.ganhos_mes).reduce((acc, item) => acc + (item.valor || 0), 0);
            return {mesId: mes.id, entradas, saidas, pagas, saldo: entradas - saidas};
          }),
        );
      } catch (err) {
        if (active) setError(errorMessage(err, 'Não foi possível montar o relatório.'));
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [mesIdFinal]);

  return {data, loading, error};
};
