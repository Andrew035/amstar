create table ticket_line_items (
  id          bigserial primary key,
  ticket_id   bigint not null references service_tickets(id) on delete cascade,
  description varchar(200) not null,
  unit_price  numeric(10,2) not null default 0 check (unit_price >= 0),
  quantity    integer not null default 1 check (quantity > 0),
  vendor      varchar(60),
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);
create index idx_line_items_ticket on ticket_line_items (ticket_id);

alter table service_tickets add column billing_type varchar(12) not null default 'RETAIL';
alter table service_tickets add constraint billing_type_valid
  check (billing_type in ('RETAIL', 'WHOLESALE'));

-- A job priced off the wholesale column was a wholesale job.
update service_tickets set billing_type = 'WHOLESALE' where include_lease = true;

alter table ticket_activity drop constraint activity_action_valid;
alter table ticket_activity add constraint activity_action_valid check (action in
  ('CREATED', 'STATUS', 'SEVERITY', 'ASSIGNED', 'SERVICES', 'PRICING', 'NOTES', 'PARTS',
   'DUE_DATE', 'CUSTOMER', 'LINE_ITEMS', 'BILLING_TYPE', 'DELETED'));
