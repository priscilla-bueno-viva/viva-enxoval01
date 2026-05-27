-- =============================================
-- VIVA STAYS — Controle de Enxoval
-- Supabase SQL Schema
-- Execute no SQL Editor do Supabase
-- =============================================

-- 1. PERFIS DE USUÁRIO
create table public.user_profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  nome text,
  is_gestor boolean default false,
  modulos text[] default '{}', -- ['deposito_limpo','predio_limpo','predio_sujo','deposito_sujo']
  predios text[] default '{}', -- ['AGR','CNZ',...] vazio = todos os predios do modulo
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.user_profiles enable row level security;

create policy "Usuários veem próprio perfil" on public.user_profiles
  for select using (auth.uid() = id);

create policy "Gestores veem todos perfis" on public.user_profiles
  for select using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and is_gestor = true
    )
  );

create policy "Gestores atualizam perfis" on public.user_profiles
  for all using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and is_gestor = true
    )
  );

-- 2. LIMPEZAS DO DIA
create table public.limpezas (
  id uuid default gen_random_uuid() primary key,
  data date not null,
  unidade text not null,
  predio text not null,
  lavanderia text check (lavanderia in ('PW','ELIS')),
  combinacao text,
  lenco_casal_esperado integer default 0,
  lenco_solteiro_esperado integer default 0,
  fronha_esperada integer default 0,
  toalha_banho_esperada integer default 0,
  toalha_rosto_esperada integer default 0,
  toalha_piso_esperada integer default 0,
  total_esperado integer default 0,
  registrado_por uuid references auth.users,
  created_at timestamptz default now()
);

alter table public.limpezas enable row level security;

create policy "Autenticados leem limpezas" on public.limpezas
  for select using (auth.role() = 'authenticated');

create policy "Autenticados inserem limpezas" on public.limpezas
  for insert with check (auth.role() = 'authenticated');

create policy "Gestores deletam limpezas" on public.limpezas
  for delete using (
    exists (select 1 from public.user_profiles where id = auth.uid() and is_gestor = true)
  );

-- 3. DEPÓSITO LIMPO (A, B, C, D)
create table public.deposito_limpo (
  id uuid default gen_random_uuid() primary key,
  data date not null,
  lavanderia text check (lavanderia in ('PW','ELIS')) not null,
  ponto text check (ponto in ('A','B','C','D')) not null,
  lenco_casal integer,
  lenco_solteiro integer,
  fronha integer,
  toalha_banho integer,
  toalha_rosto integer,
  toalha_piso integer,
  total integer,
  observacao text,
  registrado_por uuid references auth.users,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.deposito_limpo enable row level security;

create policy "Lê deposito_limpo" on public.deposito_limpo
  for select using (auth.role() = 'authenticated');

create policy "Insere deposito_limpo" on public.deposito_limpo
  for insert with check (
    auth.role() = 'authenticated' and
    (
      exists (select 1 from public.user_profiles where id = auth.uid() and is_gestor = true)
      or
      exists (select 1 from public.user_profiles where id = auth.uid() and 'deposito_limpo' = any(modulos))
    )
  );

create policy "Atualiza deposito_limpo" on public.deposito_limpo
  for update using (
    registrado_por = auth.uid()
    or exists (select 1 from public.user_profiles where id = auth.uid() and is_gestor = true)
  );

-- 4. PRÉDIO LIMPO (E, F, G)
create table public.predio_limpo (
  id uuid default gen_random_uuid() primary key,
  data date not null,
  predio text not null,
  lavanderia text check (lavanderia in ('PW','ELIS')) not null,
  ponto text check (ponto in ('E','F','G')) not null,
  lenco_casal integer,
  lenco_solteiro integer,
  fronha integer,
  toalha_banho integer,
  toalha_rosto integer,
  toalha_piso integer,
  total integer,
  observacao text,
  registrado_por uuid references auth.users,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.predio_limpo enable row level security;

create policy "Lê predio_limpo" on public.predio_limpo
  for select using (auth.role() = 'authenticated');

create policy "Insere predio_limpo" on public.predio_limpo
  for insert with check (
    auth.role() = 'authenticated' and
    (
      exists (select 1 from public.user_profiles where id = auth.uid() and is_gestor = true)
      or
      exists (select 1 from public.user_profiles where id = auth.uid() and 'predio_limpo' = any(modulos))
    )
  );

create policy "Atualiza predio_limpo" on public.predio_limpo
  for update using (
    registrado_por = auth.uid()
    or exists (select 1 from public.user_profiles where id = auth.uid() and is_gestor = true)
  );

-- 5. PRÉDIO SUJO (H, I, J)
create table public.predio_sujo (
  id uuid default gen_random_uuid() primary key,
  data date not null,
  predio text not null,
  lavanderia text check (lavanderia in ('PW','ELIS')) not null,
  ponto text check (ponto in ('H','I','J')) not null,
  numero_talao text,
  data_cos date,
  lenco_casal integer,
  lenco_solteiro integer,
  fronha integer,
  toalha_banho integer,
  toalha_rosto integer,
  toalha_piso integer,
  total integer,
  observacao text,
  registrado_por uuid references auth.users,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.predio_sujo enable row level security;

create policy "Lê predio_sujo" on public.predio_sujo
  for select using (auth.role() = 'authenticated');

create policy "Insere predio_sujo" on public.predio_sujo
  for insert with check (
    auth.role() = 'authenticated' and
    (
      exists (select 1 from public.user_profiles where id = auth.uid() and is_gestor = true)
      or
      exists (select 1 from public.user_profiles where id = auth.uid() and 'predio_sujo' = any(modulos))
    )
  );

create policy "Atualiza predio_sujo" on public.predio_sujo
  for update using (
    registrado_por = auth.uid()
    or exists (select 1 from public.user_profiles where id = auth.uid() and is_gestor = true)
  );

-- 6. DEPÓSITO SUJO (L, M, N)
create table public.deposito_sujo (
  id uuid default gen_random_uuid() primary key,
  data date not null,
  lavanderia text check (lavanderia in ('PW','ELIS')) not null,
  ponto text check (ponto in ('L','M','N')) not null,
  numero_talao text,
  predio_origem text,
  data_cos date,
  lenco_casal integer,
  lenco_solteiro integer,
  fronha integer,
  toalha_banho integer,
  toalha_rosto integer,
  toalha_piso integer,
  total integer,
  observacao text,
  registrado_por uuid references auth.users,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.deposito_sujo enable row level security;

create policy "Lê deposito_sujo" on public.deposito_sujo
  for select using (auth.role() = 'authenticated');

create policy "Insere deposito_sujo" on public.deposito_sujo
  for insert with check (
    auth.role() = 'authenticated' and
    (
      exists (select 1 from public.user_profiles where id = auth.uid() and is_gestor = true)
      or
      exists (select 1 from public.user_profiles where id = auth.uid() and 'deposito_sujo' = any(modulos))
    )
  );

create policy "Atualiza deposito_sujo" on public.deposito_sujo
  for update using (
    registrado_por = auth.uid()
    or exists (select 1 from public.user_profiles where id = auth.uid() and is_gestor = true)
  );

-- 7. TRIGGER: auto-criar perfil ao registrar usuário
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id, email, nome)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 8. ÍNDICES para performance
create index on public.limpezas (data, predio);
create index on public.deposito_limpo (data, lavanderia, ponto);
create index on public.predio_limpo (data, predio, ponto);
create index on public.predio_sujo (data, predio, ponto);
create index on public.deposito_sujo (data, lavanderia, ponto);
