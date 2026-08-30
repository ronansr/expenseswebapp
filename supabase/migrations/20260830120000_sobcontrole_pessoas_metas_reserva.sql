-- =============================================================================
-- SobControle, migração 001
-- Separação de gastos de terceiros, metas de poupança e reserva de emergência.
--
-- Rode no SQL Editor do Supabase, ou por `supabase db push` se você usa a CLI.
-- A migração é idempotente: rodar de novo não quebra nada.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Pessoas (terceiros)
--    Quem mais usa o seu dinheiro. Uma despesa com `pessoa_id` preenchido sai da
--    sua conta hoje, mas não é sua: é dívida de alguém com você.
-- -----------------------------------------------------------------------------
create table if not exists public.pessoa (
  id                  uuid primary key,
  user_id             uuid not null references auth.users (id) on delete cascade,
  nome                text not null,
  informacao          text default '',
  extra_data          text default '',
  add_date            timestamptz default now(),
  last_update         timestamptz default now(),
  last_sync           timestamptz default now(),
  logical_delete_date timestamptz
);

create index if not exists pessoa_user_id_idx on public.pessoa (user_id);

-- Vínculo da despesa com a pessoa responsável. Nulo significa "a despesa é sua".
alter table public.despesa
  add column if not exists pessoa_id uuid references public.pessoa (id) on delete set null;

create index if not exists despesa_pessoa_id_idx on public.despesa (pessoa_id);

comment on column public.despesa.pessoa_id is
  'Quando preenchido, a despesa foi paga por você mas pertence a esta pessoa. Ela fica fora dos seus totais próprios.';

-- -----------------------------------------------------------------------------
-- 2. Metas
--    Dinheiro guardado para um objetivo. O aporte do mês sai do seu saldo
--    disponível, do mesmo jeito que uma conta sai.
-- -----------------------------------------------------------------------------
create table if not exists public.meta (
  id                  uuid primary key,
  user_id             uuid not null references auth.users (id) on delete cascade,
  descricao           text not null,
  valor_alvo          numeric(14, 2) not null default 0,
  aporte_mensal       numeric(14, 2) not null default 0,
  data_alvo           date,
  concluida           boolean not null default false,
  informacao          text default '',
  extra_data          text default '',
  add_date            timestamptz default now(),
  last_update         timestamptz default now(),
  last_sync           timestamptz default now(),
  logical_delete_date timestamptz
);

create index if not exists meta_user_id_idx on public.meta (user_id);

create table if not exists public.meta_movimento (
  id                  uuid primary key,
  user_id             uuid not null references auth.users (id) on delete cascade,
  meta_id             uuid not null references public.meta (id) on delete cascade,
  mes_id              text not null,
  data                timestamptz not null default now(),
  valor               numeric(14, 2) not null,
  tipo                text not null default 'aporte',
  informacao          text default '',
  add_date            timestamptz default now(),
  last_update         timestamptz default now(),
  last_sync           timestamptz default now(),
  logical_delete_date timestamptz,
  constraint meta_movimento_tipo_check check (tipo in ('aporte', 'resgate')),
  constraint meta_movimento_valor_check check (valor >= 0)
);

create index if not exists meta_movimento_user_id_idx on public.meta_movimento (user_id);
create index if not exists meta_movimento_meta_id_idx on public.meta_movimento (meta_id);
create index if not exists meta_movimento_mes_id_idx on public.meta_movimento (mes_id);

comment on column public.meta_movimento.mes_id is 'Mês do movimento no formato yyyy-MM, igual ao id da tabela mes.';
comment on column public.meta_movimento.valor is 'Sempre positivo. O sentido do movimento está em tipo.';

-- -----------------------------------------------------------------------------
-- 3. Reserva de emergência
--    Um caixa só. Uma linha por usuário, e o saldo vem da soma dos movimentos.
-- -----------------------------------------------------------------------------
create table if not exists public.reserva (
  id                  uuid primary key,
  user_id             uuid not null unique references auth.users (id) on delete cascade,
  objetivo            numeric(14, 2) not null default 0,
  aporte_mensal       numeric(14, 2) not null default 0,
  informacao          text default '',
  extra_data          text default '',
  add_date            timestamptz default now(),
  last_update         timestamptz default now(),
  last_sync           timestamptz default now(),
  logical_delete_date timestamptz
);

create table if not exists public.reserva_movimento (
  id                  uuid primary key,
  user_id             uuid not null references auth.users (id) on delete cascade,
  mes_id              text not null,
  data                timestamptz not null default now(),
  valor               numeric(14, 2) not null,
  tipo                text not null default 'aporte',
  informacao          text default '',
  add_date            timestamptz default now(),
  last_update         timestamptz default now(),
  last_sync           timestamptz default now(),
  logical_delete_date timestamptz,
  constraint reserva_movimento_tipo_check check (tipo in ('aporte', 'resgate')),
  constraint reserva_movimento_valor_check check (valor >= 0)
);

create index if not exists reserva_movimento_user_id_idx on public.reserva_movimento (user_id);
create index if not exists reserva_movimento_mes_id_idx on public.reserva_movimento (mes_id);

comment on table public.reserva is 'Uma linha por usuário. O objetivo é a meta de colchão, o saldo sai de reserva_movimento.';

-- -----------------------------------------------------------------------------
-- 4. Segurança em nível de linha
--    Cada tabela nova é privada do dono. As políticas são recriadas a cada
--    execução para que a migração continue idempotente.
-- -----------------------------------------------------------------------------
alter table public.pessoa            enable row level security;
alter table public.meta              enable row level security;
alter table public.meta_movimento    enable row level security;
alter table public.reserva           enable row level security;
alter table public.reserva_movimento enable row level security;

do $$
declare
  nome_tabela text;
begin
  foreach nome_tabela in array array['pessoa', 'meta', 'meta_movimento', 'reserva', 'reserva_movimento']
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
