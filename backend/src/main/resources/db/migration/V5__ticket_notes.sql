-- Per-ticket notes: the running commentary the blackboard used to hold.
-- Nullable and unconstrained in length beyond a sanity cap, because this is
-- free text a manager jots between phone calls.
alter table service_tickets add column notes text;

alter table service_tickets add constraint tickets_notes_length
  check (notes is null or length(notes) <= 5000);
