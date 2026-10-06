-- Marks a car the shop has seen before. The app can work this out for itself
-- once a vehicle has two tickets, so this flag carries only what it cannot
-- know: cars that were coming here before this app existed.
alter table vehicles add column is_comeback boolean not null default false;

alter table ticket_activity drop constraint activity_action_valid;
alter table ticket_activity add constraint activity_action_valid check (action in
  ('CREATED', 'STATUS', 'SEVERITY', 'ASSIGNED', 'SERVICES', 'PRICING', 'NOTES', 'PARTS',
   'DUE_DATE', 'CUSTOMER', 'LINE_ITEMS', 'BILLING_TYPE', 'COMEBACK', 'DELETED'));
