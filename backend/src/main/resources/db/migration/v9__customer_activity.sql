-- The queue can now correct a misspelled customer name, so the feed learns
-- one more verb.
alter table ticket_activity drop constraint activity_action_valid;

alter table ticket_activity add constraint activity_action_valid check (action in
  ('CREATED', 'STATUS', 'SEVERITY', 'ASSIGNED', 'SERVICES', 'PRICING', 'NOTES', 'PARTS',
   'DUE_DATE', 'CUSTOMER', 'DELETED'));
