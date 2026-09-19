update technicians set is_active = false
  where full_name in ('Technician 1', 'Technician 2', 'Technician 3');

insert into technicians (full_name, is_active) values
  ('Max', true),
  ('Melvin', true),
  ('Adolfo', true),
  ('Jonathan', true),
  ('Brian', true),
  ('Caly', true),
  ('Nate', true),
  ('Alex', true),
  ('Alberto', true)
on conflict do nothing;
