import {useCallback, useEffect, useMemo, useState} from 'react';
import {addMonths} from 'date-fns';
import {dashboardService} from '../services';
import type {DashboardData} from '../types';
import {toMesId} from '../lib/format';
import {monthTotals} from '../lib/selectors';
import {errorMessage} from '../lib/errors';

export const useDashboard = (enabled: boolean) => {
  const [mesId, setMesId] = useState(() => toMesId(new Date()));
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setDashboard(await dashboardService.get(mesId));
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [mesId]);

  useEffect(() => {
    if (enabled) load();
  }, [enabled, load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const shiftMonth = useCallback((amount: number) => {
    setMesId(current => toMesId(addMonths(new Date(`${current}-01T12:00:00`), amount)));
  }, []);

  const goToCurrentMonth = useCallback(() => setMesId(toMesId(new Date())), []);

  /** Salto direto para um mês, sem passar pelos meses do caminho. */
  const goToMonth = useCallback((next: string) => setMesId(next), []);

  /** Lista filtrada por categoria. Filtro vazio significa todas. */
  const expenses = useMemo(() => {
    const list = dashboard?.despesas || [];
    return categoryFilter.length ? list.filter(item => categoryFilter.includes(item.categoriaId)) : list;
  }, [dashboard, categoryFilter]);

  const totals = useMemo(
    () => monthTotals(expenses, dashboard?.mes_info.total_ganhos || 0),
    [expenses, dashboard],
  );

  return {
    mesId,
    dashboard,
    expenses,
    totals,
    loading,
    refreshing,
    error,
    categoryFilter,
    setCategoryFilter,
    shiftMonth,
    goToCurrentMonth,
    goToMonth,
    reload: load,
    refresh,
  };
};
