-- =============================================================================
-- SobControle, migração 003
-- De onde veio o dinheiro de um movimento de investimento.
--
-- Rode no SQL Editor do Supabase, ou por `supabase db push` se você usa a CLI.
-- A migração é idempotente: rodar de novo não quebra nada.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Origem do recurso
--    Cadastrar uma aplicação que já existia não é gastar o salário do mês. Antes
--    desta coluna todo aporte descontava do saldo, o que fazia o mês parecer
--    pior do que era só porque a carteira foi registrada.
--
--      mes      o dinheiro saiu do recebimento do mês e desconta do saldo
--      externo  o dinheiro já estava fora da conta e não mexe no saldo do mês
--
--    O padrão é 'mes' de propósito: as linhas que já existem foram lançadas com
--    esse significado, e mudar o passado sozinho seria pior do que deixar a
--    pessoa corrigir na tela o que precisa ser corrigido.
-- -----------------------------------------------------------------------------
alter table public.investimento_movimento
  add column if not exists origem_recurso text not null default 'mes';

do $$
begin
  alter table public.investimento_movimento
    add constraint investimento_movimento_origem_check
    check (origem_recurso in ('mes', 'externo'));
exception
  when duplicate_object then null;
end
$$;

comment on column public.investimento_movimento.origem_recurso is
  'mes: saiu do recebimento do mês e desconta do saldo. externo: o dinheiro já estava fora da conta e não entra no saldo do mês.';

create index if not exists investimento_movimento_origem_idx
  on public.investimento_movimento (origem_recurso);
