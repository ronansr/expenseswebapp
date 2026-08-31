import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
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
  const requestRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setLoading(true);
    setError('');
    try {
      const next = await dashboardService.get(mesId);
      if (requestRef.current === requestId) setDashboard(next);
    } catch (err) {
      if (requestRef.current !== requestId) return;
      console.error('Erro ao carregar dados:', err);
      setError(errorMessage(err));
    } finally {
      if (requestRef.current === requestId) setLoading(false);
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
  const currentDashboard = dashboard?.mes_info.id === mesId ? dashboard : null;

  const expenses = useMemo(() => {
    const list = currentDashboard?.despesas || [];
    return categoryFilter.length ? list.filter(item => categoryFilter.includes(item.categoriaId)) : list;
  }, [currentDashboard, categoryFilter]);

  const totals = useMemo(
    () => monthTotals(expenses, currentDashboard?.mes_info.total_ganhos || 0),
    [expenses, currentDashboard],
  );

  return {
    mesId,
    dashboard: currentDashboard,
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
