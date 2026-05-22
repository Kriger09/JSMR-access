-- JSMR Access
-- Base de datos inicial para Supabase / PostgreSQL
-- Fraccionamiento José María Sánchez Ramírez

create extension if not exists "pgcrypto";

-- =========================
-- TABLA: houses
-- Casas registradas del fraccionamiento
-- =========================

create table if not exists public.houses (
  id uuid primary key default gen_random_uuid(),
  house_number text not null unique,
  resident_name text not null,
  resident_phone text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists houses_house_number_idx
on public.houses (house_number);

-- =========================
-- TABLA: visits
-- Códigos QR generados para visitantes
-- =========================

create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.houses(id) on delete restrict,
  visitor_name text not null,
  qr_token text not null unique,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,

  constraint visits_status_check check (
    status in ('active', 'expired', 'cancelled', 'rejected')
  )
);

create index if not exists visits_qr_token_idx
on public.visits (qr_token);

create index if not exists visits_house_id_idx
on public.visits (house_id);

create index if not exists visits_status_idx
on public.visits (status);

-- =========================
-- TABLA: access_logs
-- Historial de accesos aprobados o rechazados por caseta
-- =========================

create table if not exists public.access_logs (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.visits(id) on delete cascade,
  house_id uuid not null references public.houses(id) on delete restrict,
  action text not null,
  guard_name text,
  notes text,
  scanned_at timestamptz not null default now(),

  constraint access_logs_action_check check (
    action in ('approved', 'rejected')
  )
);

create index if not exists access_logs_visit_id_idx
on public.access_logs (visit_id);

create index if not exists access_logs_house_id_idx
on public.access_logs (house_id);

create index if not exists access_logs_scanned_at_idx
on public.access_logs (scanned_at desc);

-- =========================
-- FUNCIÓN: updated_at automático
-- =========================

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- =========================
-- TRIGGER: houses.updated_at
-- =========================

drop trigger if exists set_houses_updated_at on public.houses;

create trigger set_houses_updated_at
before update on public.houses
for each row
execute function public.set_updated_at();

-- =========================
-- DATOS DE PRUEBA
-- Puedes cambiarlos después por casas reales
-- =========================

insert into public.houses (house_number, resident_name, resident_phone)
values
  ('Casa 1', 'Residente Demo 1', null),
  ('Casa 2', 'Residente Demo 2', null),
  ('Casa 3', 'Residente Demo 3', null)
on conflict (house_number) do nothing;
