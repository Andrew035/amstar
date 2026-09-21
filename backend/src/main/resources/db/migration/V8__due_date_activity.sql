-- The queue can now move a due date, so the feed learns one more verb.
alter table ticket_activity drop constraint activity_action_valid;

alter table ticket_activity add constraint activity_action_valid check (action in
  ('CREATED', 'STATUS', 'SEVERITY', 'ASSIGNED', 'SERVICES', 'PRICING', 'NOTES', 'PARTS',
   'DUE_DATE', 'DELETED'));
