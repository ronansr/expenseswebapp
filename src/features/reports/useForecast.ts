import {useEffect, useState} from 'react';
import {expenseService, monthService, userService} from '../../services';
import type {ValorResumo} from '../../types';
import {marcosDeAlivio, projetarMeses, resumoProjecao, type Alivio, type ForecastResumo, type MesProjetado} from '../../lib/forecast';
import {normalizeGanhos} from '../../lib/format';
import {errorMessage} from '../../lib/errors';

/** Quantos meses para trás a série mostra, e quantos para frente ela projeta. */
export const JANELA_PASSADO = 6;
export const HORIZONTE_FUTURO = 12;

export type ForecastState = {
  serie: MesProjetado[];
  marcos: Alivio[];
  resumo: ForecastResumo | null;
  loading: boolean;
  error: string;
};

/**
 * Série do passado somada à projeção do futuro. Usa os mesmos serviços já
 * existentes: monthService.list para os meses e expenseService.listByMonths para
 * as despesas. As parcelas futuras já são linhas no banco, então o futuro não é
 * chute: é o que já está contratado.
 */
export const useForecast = (mesAtual: string): ForecastState => {
  const [serie, setSerie] = useState<MesProjetado[]>([]);
  const [marcos, setMarcos] = useState<Alivio[]>([]);
  const [resumo, setResumo] = useState<ForecastResumo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    (async () => {
      try {
        const [meses, perfil] = await Promise.all([monthService.list(), userService.getUser()]);
        const despesas = await expenseService.listByMonths(meses);
        if (!active) return;

        const ganhosRecorrentes = normalizeGanhos(perfil?.ganhos_mensais) as ValorResumo[];
        const completa = projetarMeses({
          meses,
          despesas,
          ganhosRecorrentes,
          mesAtual,
          horizonte: HORIZONTE_FUTURO,
        });

        /* O passado inteiro polui o gráfico. Mostramos a janela recente e todo o futuro. */
        const passado = completa.filter(item => !item.futuro).slice(-JANELA_PASSADO);
        const futuro = completa.filter(item => item.futuro);
        const recortada = [...passado, ...futuro];

        setSerie(recortada);
        setMarcos(marcosDeAlivio(completa));
        setResumo(resumoProjecao(completa));
      } catch (err) {
        if (active) setError(errorMessage(err, 'Não foi possível montar a projeção.'));
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [mesAtual]);

  return {serie, marcos, resumo, loading, error};
};
