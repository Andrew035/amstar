-- Parts pad: the same free text as notes, kept separate so the parts a job
-- needs are not buried in the running commentary.

-- Deilberately NOT a parts table with part numbers and prices: the shop writes
-- these down as they quote them, and the numbers change. Structured rows would
-- promise a priced inventory the app does not keep.
alter table service_tickets add column parts text;

alter table service_tickets add constraint tickets_parts_length
  check (parts is null or length(parts) <= 5000);

-- The activity feed learns one more verb.
alter table ticket_activity drop constraint activity_action_valid;

alter table ticket_activity add constraint activity_action_valid check (action in 
  ('CREATED', 'STATUS', 'SEVERITY', 'ASSIGNED', 'SERVICES', 'PRICING', 'NOTES', 'PARTS',
  'DELETED'));
