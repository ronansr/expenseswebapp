-- =============================================================================
-- SobControle, migração 002
-- Investimentos com rendimento real, e teto de gasto por categoria.
--
-- Rode no SQL Editor do Supabase, ou por `supabase db push` se você usa a CLI.
-- A migração é idempotente: rodar de novo não quebra nada.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Investimentos
--    Uma linha por aplicação. O saldo aplicado é a soma dos movimentos, igual as
--    metas e a reserva. O rendimento nunca é gravado: ele é derivado da taxa do
--    indexador e do tempo que cada aporte passou aplicado.
--
--    tipo diz de onde vem a taxa:
--      poupanca    rendimento mensal da poupanca (BCB SGS 195)
--      cdi         percentual do CDI            (indice_percentual, ex: 110)
--      selic       percentual da Selic          (indice_percentual)
--      prefixado   taxa fixa em % ao ano        (taxa_fixa)
--      ipca        IPCA do periodo mais spread  (taxa_fixa como spread a.a.)
-- -----------------------------------------------------------------------------
create table if not exists public.investimento (
  id                  uuid primary key,
  user_id             uuid not null references auth.users (id) on delete cascade,
  meta_id             uuid references public.meta (id) on delete set null,
  descricao           text not null,
  tipo                text not null default 'cdi',
  indice_percentual   numeric(9, 4) not null default 100,
  taxa_fixa           numeric(9, 4) not null default 0,
  liquidez_diaria     boolean not null default true,
  informacao          text default '',
  extra_data          text default '',
  add_date            timestamptz default now(),
  last_update         timestamptz default now(),
  last_sync           timestamptz default now(),
  logical_delete_date timestamptz,
  constraint investimento_tipo_check
    check (tipo in ('poupanca', 'cdi', 'selic', 'prefixado', 'ipca'))
);

create index if not exists investimento_user_id_idx on public.investimento (user_id);
create index if not exists investimento_meta_id_idx on public.investimento (meta_id);

comment on column public.investimento.meta_id is
  'Quando preenchido, o saldo desta aplicação conta como lastro da meta. O dinheiro continua sendo um só: a meta mostra o guardado mais o investido.';
comment on column public.investimento.indice_percentual is
  'Percentual do indexador, para cdi e selic. 110 significa 110% do CDI.';
comment on column public.investimento.taxa_fixa is
  'Taxa em % ao ano. Para prefixado é a taxa inteira, para ipca é só o spread.';

create table if not exists public.investimento_movimento (
  id                  uuid primary key,
  user_id             uuid not null references auth.users (id) on delete cascade,
  investimento_id     uuid not null references public.investimento (id) on delete cascade,
  mes_id              text not null,
  data                timestamptz not null default now(),
  valor               numeric(14, 2) not null,
  tipo                text not null default 'aporte',
  informacao          text default '',
  add_date            timestamptz default now(),
  last_update         timestamptz default now(),
  last_sync           timestamptz default now(),
  logical_delete_date timestamptz,
  constraint investimento_movimento_tipo_check check (tipo in ('aporte', 'resgate')),
  constraint investimento_movimento_valor_check check (valor >= 0)
);

create index if not exists investimento_movimento_user_id_idx on public.investimento_movimento (user_id);
create index if not exists investimento_movimento_inv_idx on public.investimento_movimento (investimento_id);
create index if not exists investimento_movimento_mes_id_idx on public.investimento_movimento (mes_id);

comment on column public.investimento_movimento.mes_id is 'Mês do movimento no formato yyyy-MM, igual ao id da tabela mes.';
comment on column public.investimento_movimento.valor is 'Sempre positivo. O sentido do movimento está em tipo.';

-- -----------------------------------------------------------------------------
-- 2. Teto de gasto por categoria
--    Zero significa "sem teto". O alerta é calculado na leitura, comparando o
--    ritmo do mês com o teto, e nunca é gravado.
-- -----------------------------------------------------------------------------
alter table public.categoriadespesa
  add column if not exists limite_mensal numeric(14, 2) not null default 0;

comment on column public.categoriadespesa.limite_mensal is
  'Teto mensal de gasto da categoria. Zero desliga o alerta.';

-- -----------------------------------------------------------------------------
-- 3. Segurança em nível de linha
-- -----------------------------------------------------------------------------
alter table public.investimento           enable row level security;
alter table public.investimento_movimento enable row level security;

do $$
declare
  nome_tabela text;
begin
  foreach nome_tabela in array array['investimento', 'investimento_movimento']
  loop
    execute format('drop policy if exists %I on public.%I', nome_tabela || '_owner_select', nome_tabela);
    execute format('drop policy if exists %I on public.%I', nome_tabela || '_owner_insert', nome_tabela);
    execute format('drop policy if exists %I on public.%I', nome_tabela || '_owner_update', nome_tabela);
    execute format('drop policy if exists %I on public.%I', nome_tabela || '_owner_delete', nome_tabela);

    execute format(
      'create policy %I on public.%I for select to authenticated using (user_id = auth.uid())',
      nome_tabela || '_owner_select', nome_tabela);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (user_id = auth.uid())',
      nome_tabela || '_owner_insert', nome_tabela);
    execute format(
      'create policy %I on public.%I for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())',
      nome_tabela || '_owner_update', nome_tabela);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (user_id = auth.uid())',
      nome_tabela || '_owner_delete', nome_tabela);
  end loop;
end
$$;
