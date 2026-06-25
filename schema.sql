-- ============================================
-- CARACAS AYUDA - Schema Supabase
-- Ejecutar en SQL Editor de Supabase
-- ============================================

-- Tabla principal de puntos (visibles en el mapa)
create table puntos (
  id uuid default gen_random_uuid() primary key,
  nombre text not null,
  categoria text not null check (categoria in ('agua','comida','refugio','medico','medicamentos','carga','mascotas','combustible')),
  lat numeric(10,6) not null,
  lng numeric(10,6) not null,
  direccion text,
  horario text,
  telefono text,
  descripcion text,
  necesitan text,
  ofrecen text,
  estado text default 'pending' check (estado in ('verified','pending','old')),
  reportado_por text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tabla de submissions de usuarios (pendientes de revisión)
create table submissions (
  id uuid default gen_random_uuid() primary key,
  nombre text not null,
  categoria text not null,
  direccion text,
  horario text,
  telefono text,
  descripcion text,
  reportado_por text,
  revisado boolean default false,
  created_at timestamptz default now()
);

-- Índices para búsqueda rápida
create index puntos_categoria_idx on puntos(categoria);
create index puntos_estado_idx on puntos(estado);
create index submissions_revisado_idx on submissions(revisado);

-- RLS (Row Level Security)
alter table puntos enable row level security;
alter table submissions enable row level security;

-- Política: cualquiera puede leer puntos verificados y pendientes
create policy "Puntos visibles públicamente"
  on puntos for select
  using (true);

-- Política: cualquiera puede insertar submissions
create policy "Usuarios pueden enviar submissions"
  on submissions for insert
  with check (true);

-- Política: solo service_role puede modificar puntos y ver submissions
create policy "Admin puede gestionar puntos"
  on puntos for all
  using (auth.role() = 'service_role');

create policy "Admin puede ver submissions"
  on submissions for select
  using (auth.role() = 'service_role');

-- Función para auto-actualizar updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger puntos_updated_at
  before update on puntos
  for each row execute function update_updated_at();

-- ============================================
-- DATOS INICIALES (puntos de ejemplo)
-- ============================================
insert into puntos (nombre, categoria, lat, lng, direccion, horario, telefono, descripcion, necesitan, ofrecen, estado) values
  ('Distribución de Agua Candelaria', 'agua', 10.506000, -66.906000, 'Av. Este 2, La Candelaria, Caracas', '7am–7pm', '0212-123-4567', 'Camiones cisterna. Traer envases propios.', 'Envases vacíos', 'Agua potable', 'verified'),
  ('Cisterna Chacao', 'agua', 10.491000, -66.856000, 'Av. Francisco de Miranda, Chacao', '8am–5pm', '', 'Distribución gratuita de agua potable.', '', 'Agua potable', 'pending'),
  ('Comedor El Valle', 'comida', 10.449000, -66.894000, 'El Valle, Caracas', '7am–2pm', '0414-111-2233', 'Desayuno y almuerzo caliente gratuito.', 'Arroz y aceite', 'Desayuno y almuerzo', 'verified'),
  ('Acopio Alimentario Petare', 'comida', 10.489000, -66.797000, 'Petare, Caracas', '8am–4pm', '0416-555-9876', 'Bolsas de alimentos para familias damnificadas.', 'Caraotas y harina', 'Bolsas de comida', 'verified'),
  ('Refugio Polideportivo Catia', 'refugio', 10.512000, -66.948000, 'Catia, Caracas', '24 horas', '0212-234-5678', 'Familias desplazadas. Capacidad 400 personas.', 'Colchonetas', 'Techo y comida básica', 'verified'),
  ('Albergue La Guaira', 'refugio', 10.601000, -66.934000, 'La Guaira, Estado La Guaira', '24 horas', '', 'Zona de desastre. Albergue de emergencia habilitado.', 'Todo tipo de ayuda', 'Refugio temporal', 'verified'),
  ('Hospital Pérez Carreño', 'medico', 10.497000, -66.923000, 'Av. José Felix Sosa, Caracas', '24 horas', '0212-456-7890', 'Emergencias operativa. Sala de trauma activa.', 'Sangre O+', 'Atención de emergencia', 'verified'),
  ('Puesto Médico Propatria', 'medico', 10.517000, -66.963000, 'Propatria, Caracas', '24 horas', '0212-321-0987', 'Puesto de campaña. Heridas y atención básica.', 'Gasas y agua oxigenada', 'Atención básica', 'verified'),
  ('Farmacia Cruz Roja Los Palos Grandes', 'medicamentos', 10.488000, -66.879000, 'Los Palos Grandes, Caracas', '24 horas', '0212-789-0123', 'Medicamentos esenciales gratuitos.', 'Antibióticos', 'Medicamentos básicos', 'verified'),
  ('Punto de Carga Solar Libertador', 'carga', 10.502000, -66.932000, 'Av. Libertador, Caracas', 'No confirmado', '', 'Carga de teléfonos con paneles solares.', '', 'Carga de dispositivos', 'pending'),
  ('Albergue Mascotas Caracas', 'mascotas', 10.508000, -66.861000, 'Av. Urdaneta, Caracas', '9am–6pm', '0412-888-7766', 'Refugio temporal para mascotas de damnificados.', 'Comida para perros y gatos', 'Alojamiento mascotas', 'pending'),
  ('Gasolinera Operativa Las Mercedes', 'combustible', 10.476000, -66.854000, 'Las Mercedes, Caracas', '6am–6pm', '', 'Una de las pocas estaciones con combustible disponible.', '', 'Gasolina', 'pending');
