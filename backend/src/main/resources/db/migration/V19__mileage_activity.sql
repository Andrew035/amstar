-- Mileage and the phone number can be filled in later: the shop often does not
-- have either at drop-off. Mileage is its own action so the feed can say the
-- odometer was recorded; a phone number rides on CUSTOMER, since it belongs to
-- the customer record that action already covers.
--
-- The list is restated in full from `select pg_get_constraintdef(oid) from
-- pg_constraint where conname = 'activity_action_valid'`, not from an older
-- migration. Postgres cannot append to a CHECK, and copying a stale list
-- silently revokes every action added since - which is how V15 briefly dropped
-- COMEBACK and started 409ing.
alter table ticket_activity drop constraint activity_action_valid;

alter table ticket_activity add constraint activity_action_valid check (action in
  ('CREATED', 'STATUS', 'SEVERITY', 'ASSIGNED', 'SERVICES', 'PRICING', 'NOTES',
   'PARTS', 'DUE_DATE', 'CUSTOMER', 'LINE_ITEMS', 'BILLING_TYPE', 'COMEBACK',
   'INVOICED', 'MILEAGE', 'DELETED'));
