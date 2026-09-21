-- Misión Secreta — Dani & Wally
-- Ejecutar completo en Supabase: Dashboard > SQL Editor > New query > pegar todo > Run.
-- Es seguro volver a correrlo (usa IF NOT EXISTS / OR REPLACE / migraciones condicionales),
-- incluso si ya corriste una versión anterior de este mismo archivo.

create extension if not exists pgcrypto;

-- ============================================================
-- Tabla principal: una fila por desafío completado (no por foto:
-- si el invitado reemplaza la foto, se actualiza esta misma fila).
-- ============================================================
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null,
  guest_name text not null,
  grupo text not null check (grupo in ('A', 'B', 'C', 'D', 'E')),
  challenge_id text not null,
  challenge_title text not null,
  photo_path text not null,
  -- completed_at: cuándo se completó por PRIMERA vez. No cambia nunca más
  -- (lo protege el trigger de abajo). Es lo que se usa para el desempate
  -- del ranking, así corregir una foto no altera el orden.
  completed_at timestamptz not null default now(),
  -- updated_at: cuándo se subió la foto que está actualmente. Cambia en
  -- cada edición.
  updated_at timestamptz not null default now(),
  unique (guest_id, challenge_id)
);

create index if not exists submissions_grupo_idx on public.submissions (grupo);
create index if not exists submissions_challenge_idx on public.submissions (challenge_id);

-- Migración de instalaciones previas de este mismo proyecto que todavía
-- tengan la columna vieja "created_at" en vez de "completed_at".
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'submissions' and column_name = 'created_at'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'submissions' and column_name = 'completed_at'
  ) then
    alter table public.submissions rename column created_at to completed_at;
  end if;
end $$;

alter table public.submissions
  add column if not exists updated_at timestamptz not null default now();

-- ============================================================
-- Trigger de protección: aunque la policy de UPDATE sea permisiva
-- (para que un invitado pueda corregir SU foto sin cuenta ni login),
-- esto impide que una edición cambie a qué invitado/grupo/desafío
-- pertenece la fila, o pise la fecha de "primera vez completado".
-- Solo pueden cambiar photo_path, challenge_title y guest_name.
-- ============================================================
create or replace function public.submissions_before_write()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    new.guest_id := old.guest_id;
    new.grupo := old.grupo;
    new.challenge_id := old.challenge_id;
    new.completed_at := old.completed_at;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists submissions_before_write on public.submissions;
create trigger submissions_before_write
  before insert or update on public.submissions
  for each row execute function public.submissions_before_write();

-- ============================================================
-- Row Level Security.
-- INSERT: cualquiera puede crear su primera entrada para un desafío.
-- UPDATE: cualquiera puede "editar" una entrada (reemplazar su foto).
--   Esto es más permisivo que decir "solo el dueño" porque no hay
--   cuentas ni login — el trigger de arriba es la barrera real que
--   evita que una edición reasigne la fila a otro invitado/desafío.
-- No hay policy de SELECT: nadie puede leer la tabla completa
-- (nombres, fotos) con la clave pública del frontend.
-- ============================================================
alter table public.submissions enable row level security;

drop policy if exists "anon puede insertar misiones" on public.submissions;
create policy "anon puede insertar misiones"
  on public.submissions
  for insert
  to anon
  with check (true);

drop policy if exists "anon puede editar su propia misión" on public.submissions;
create policy "anon puede editar su propia misión"
  on public.submissions
  for update
  to anon
  using (true)
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
  (array_agg(guest_name order by updated_at desc))[1] as guest_name,
  count(*)::int as points,
  max(completed_at) as reached_at
from public.submissions
group by guest_id;

grant select on public.ranking to anon;

-- ============================================================
-- Storage: bucket público "photos".
-- Público en lectura (para no complicar URLs firmadas ni el admin),
-- pero los nombres de archivo no son listables por navegación directa.
-- No hay policy de DELETE: al editar una foto, la anterior queda
-- huérfana en el bucket en vez de borrarse. Es un gasto de espacio
-- menor y aceptable a cambio de no abrirle borrado público al bucket.
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
