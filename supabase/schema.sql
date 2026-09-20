-- Misión Secreta — Dani & Wally
-- Ejecutar completo en Supabase: Dashboard > SQL Editor > New query > pegar todo > Run.
-- Es seguro volver a correrlo (usa IF NOT EXISTS / ON CONFLICT donde corresponde).

create extension if not exists pgcrypto;

-- ============================================================
-- Tabla principal: una fila por foto subida.
-- ============================================================
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null,
  guest_name text not null,
  grupo text not null check (grupo in ('A', 'B', 'C', 'D', 'E')),
  challenge_id text not null,
  challenge_title text not null,
  photo_path text not null,
  created_at timestamptz not null default now(),
  -- Esto es lo que evita el doble punto: un mismo dispositivo (guest_id)
  -- no puede insertar dos veces el mismo challenge_id.
  unique (guest_id, challenge_id)
);

create index if not exists submissions_grupo_idx on public.submissions (grupo);
create index if not exists submissions_challenge_idx on public.submissions (challenge_id);

-- ============================================================
-- Row Level Security: el frontend público solo puede INSERTAR.
-- No hay policy de SELECT para "anon", así que nadie puede leer
-- la tabla completa (nombres, fotos) con la clave pública del frontend.
-- ============================================================
alter table public.submissions enable row level security;

drop policy if exists "anon puede insertar misiones" on public.submissions;
create policy "anon puede insertar misiones"
  on public.submissions
  for insert
  to anon
  with check (true);

-- ============================================================
-- Vista pública de ranking: agrega por guest_id, expone solo
-- nombre + puntos + cuándo alcanzó ese puntaje (para el desempate).
-- Al no tener security_invoker, la vista corre con los permisos de
-- quien la creó (no los del usuario anon), así que puede leer la
-- tabla base aunque el anon no tenga permiso de SELECT directo sobre ella.
-- ============================================================
create or replace view public.ranking as
select
  guest_id,
  (array_agg(guest_name order by created_at desc))[1] as guest_name,
  count(*)::int as points,
  max(created_at) as reached_at
from public.submissions
group by guest_id;

grant select on public.ranking to anon;

-- ============================================================
-- Storage: bucket público "photos".
-- Público en lectura (para no complicar URLs firmadas ni el admin),
-- pero los nombres de archivo son UUIDs, no son adivinables ni están listados.
-- ============================================================
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

drop policy if exists "anon puede subir fotos" on storage.objects;
create policy "anon puede subir fotos"
  on storage.objects
  for insert
  to anon
  with check (bucket_id = 'photos');

drop policy if exists "cualquiera puede leer fotos" on storage.objects;
create policy "cualquiera puede leer fotos"
  on storage.objects
  for select
  to anon
  using (bucket_id = 'photos');
