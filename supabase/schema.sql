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

-- (La vista pública de ranking se define más abajo, después de
-- guest_profile, porque usa el nombre actual del perfil.)

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

-- ============================================================
-- "La Foto de la Noche": competencia paralela, totalmente separada de
-- submissions/ranking. Es una tabla propia a propósito — así es
-- estructuralmente imposible que esto le sume puntos al ranking normal,
-- no depende de acordarse de filtrarla en ningún lado.
-- Una fila por invitado (unique guest_id): subir de nuevo reemplaza la
-- candidatura anterior, nunca crea una segunda.
-- ============================================================
create table if not exists public.night_photo (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null unique,
  guest_name text not null,
  grupo text not null check (grupo in ('A', 'B', 'C', 'D', 'E')),
  photo_path text not null,
  updated_at timestamptz not null default now()
);

create or replace function public.night_photo_touch()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists night_photo_touch on public.night_photo;
create trigger night_photo_touch
  before insert or update on public.night_photo
  for each row execute function public.night_photo_touch();

alter table public.night_photo enable row level security;

drop policy if exists "anon puede insertar foto de la noche" on public.night_photo;
create policy "anon puede insertar foto de la noche"
  on public.night_photo
  for insert
  to anon
  with check (true);

drop policy if exists "anon puede editar su foto de la noche" on public.night_photo;
create policy "anon puede editar su foto de la noche"
  on public.night_photo
  for update
  to anon
  using (true)
  with check (true);

-- Reutiliza el mismo bucket "photos" (la policy de insert/select de
-- arriba ya alcanza para cualquier carpeta dentro del bucket, así que
-- no hace falta una policy de Storage nueva).

-- ============================================================
-- Datos de identificación del invitado (nombre, apellido, email opcional).
-- Tabla propia, separada de submissions/night_photo a propósito: así
-- editar el perfil nunca puede tocar progreso, fotos ni puntos — son
-- escrituras completamente independientes, ligadas solo por guest_id.
-- Una fila por invitado (unique guest_id): volver a guardar el perfil
-- actualiza esa misma fila, nunca crea una segunda.
-- ============================================================
create table if not exists public.guest_profile (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null unique,
  first_name text not null,
  last_name text not null,
  email text,
  updated_at timestamptz not null default now()
);

create or replace function public.guest_profile_touch()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists guest_profile_touch on public.guest_profile;
create trigger guest_profile_touch
  before insert or update on public.guest_profile
  for each row execute function public.guest_profile_touch();

alter table public.guest_profile enable row level security;

drop policy if exists "anon puede insertar su perfil" on public.guest_profile;
create policy "anon puede insertar su perfil"
  on public.guest_profile
  for insert
  to anon
  with check (true);

drop policy if exists "anon puede editar su perfil" on public.guest_profile;
create policy "anon puede editar su perfil"
  on public.guest_profile
  for update
  to anon
  using (true)
  with check (true);

-- ============================================================
-- Backups del ranking, para cuando Dani/Wally usen el botón de reset en
-- /admin. RLS habilitado SIN ninguna policy para "anon" a propósito: nadie
-- puede leer ni escribir esto con la clave pública, solo la Netlify
-- Function con la service_role key (que igual bypassea RLS).
-- ============================================================
create table if not exists public.ranking_backups (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by text,
  data jsonb not null
);

alter table public.ranking_backups enable row level security;

-- ============================================================
-- Historial de cambios de nombre: se llena solo, con un trigger, cada vez
-- que "Mi perfil" cambia first_name/last_name. Guarda el valor ANTERIOR,
-- así queda trazabilidad de que hubo un cambio (y cuál era el nombre
-- antes) para que Dani/Wally lo puedan ver en /admin. RLS sin policies
-- para "anon" — mismo criterio que ranking_backups: solo lo lee la
-- Netlify Function con la service_role key.
-- ============================================================
create table if not exists public.guest_profile_history (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null,
  old_first_name text,
  old_last_name text,
  new_first_name text,
  new_last_name text,
  changed_at timestamptz not null default now()
);

alter table public.guest_profile_history enable row level security;

create or replace function public.guest_profile_log_change()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and (
    old.first_name is distinct from new.first_name
    or old.last_name is distinct from new.last_name
  ) then
    insert into public.guest_profile_history (guest_id, old_first_name, old_last_name, new_first_name, new_last_name)
    values (old.guest_id, old.first_name, old.last_name, new.first_name, new.last_name);
  end if;
  return new;
end;
$$;

drop trigger if exists guest_profile_log_change on public.guest_profile;
create trigger guest_profile_log_change
  after update on public.guest_profile
  for each row execute function public.guest_profile_log_change();

-- ============================================================
-- Vista pública de ranking: agrega por guest_id. El nombre mostrado sale
-- del perfil ACTUAL del invitado (guest_profile), no de lo que haya
-- quedado grabado en cada fila de submissions — así, si alguien corrige su
-- nombre desde "Mi perfil", el ranking lo refleja al toque, sin esperar a
-- que suba otra foto. Si por algún motivo no hay perfil para ese guest_id
-- (invitados de una versión muy vieja), cae al nombre que había en la
-- última foto subida, como antes.
-- Al no tener security_invoker, la vista corre con los permisos de quien
-- la creó, así que puede leer submissions/guest_profile aunque el anon no
-- tenga permiso de SELECT directo sobre esas tablas.
-- ============================================================
create or replace view public.ranking as
select
  s.guest_id,
  coalesce(
    (
      select trim(gp.first_name || ' ' || gp.last_name)
      from public.guest_profile gp
      where gp.guest_id = s.guest_id
    ),
    (array_agg(s.guest_name order by s.updated_at desc))[1]
  ) as guest_name,
  count(*)::int as points,
  max(s.completed_at) as reached_at
from public.submissions s
group by s.guest_id;

grant select on public.ranking to anon;
