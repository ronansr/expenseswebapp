-- =============================================================================
-- SobControle, migração 004
-- Isenção de imposto de renda por aplicação.
--
-- Rode no SQL Editor do Supabase, ou por `supabase db push` se você usa a CLI.
-- A migração é idempotente: rodar de novo não quebra nada.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Isenção de IR
--    O imposto sobre renda fixa depende do produto, e o produto não cabe no
--    campo `tipo`: uma LCI e um CDB podem render o mesmo percentual do CDI e
--    ter tratamento tributário oposto. Por isso a isenção é marcada, não
--    deduzida.
--
--    A poupança é isenta por lei e não depende desta coluna: o cálculo já a
--    trata como isenta em qualquer caso.
--
--    A alíquota em si nunca vai para o banco. Ela sai da tabela regressiva pelo
--    tempo que cada aporte passou aplicado, em `src/lib/investments.ts`, do
--    mesmo jeito que o rendimento.
-- -----------------------------------------------------------------------------
alter table public.investimento
  add column if not exists isento_ir boolean not null default false;

comment on column public.investimento.isento_ir is
  'Verdadeiro para LCI, LCA, CRI, CRA e debênture incentivada. A poupança é isenta por lei, independente desta coluna.';
