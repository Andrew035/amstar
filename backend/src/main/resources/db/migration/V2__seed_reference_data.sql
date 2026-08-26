-- ===================================================================
-- Reference data. Replace both lists with the shop's real
-- technician names and actual services - being rows instead of
-- a hardcoded array is the whole point.
--
-- No users are seeded here: password hashes must be real BCrypt
-- output, and a hash in a migration file is a credential in git.
-- Register the 4 accounts through POST /api/auth/register once,
-- then promote the three managers:
--   UPDATE users SET role = 'ADMIN'
--   WHERE username IN ('admin1', 'admin2', 'admin3');
-- ===================================================================

insert into technicians (full_name, is_active) values
  ('Technician 1', true),
  ('Technician 2', true),
  ('Technician 3', true);

insert into services (name, default_severity) values
  ('FULL TRANSMISSION REBUILD', 5),
  ('TRANSMISSION FLUID CHANGE', 2),
  ('CLUTCH REPLACEMENT', 4),
  ('TORQUE CONVERTER REPLACEMENT', 4),
  ('TRANSMISSION DIAGNOSTIC', 2),
  ('OIL CHANGE', 1),
  ('TIRE ROTATION', 1);
