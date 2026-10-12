-- "Completed" meant two different things to the two people using it: the car is
-- out of the shop, or the invoice can be written. READY_FOR_INVOICE is the
-- second one, named so it cannot be mistaken for the first.
--
-- tickets_completion_matches_status is deliberately NOT touched. It reads
-- (status = 'COMPLETED') = (actual_completion_date is not null), so the new
-- status is required to carry a null date and gets that for free.
ALTER TABLE service_tickets
    DROP CONSTRAINT tickets_status_valid;

ALTER TABLE service_tickets
    ADD CONSTRAINT tickets_status_valid CHECK (status IN ('PENDING', 'IN_PROGRESS', 'READY_FOR_INVOICE', 'COMPLETED'));

-- The bookkeeper clearing a ticket is its own action, separate from STATUS, so
-- the feed distinguishes "the owner says the work is done" from "the invoice is
-- written". Added here rather than in a later migration because it ships on the
-- same branch, and a migration that has run anywhere can never be edited.
-- No amount, same as every other pricing-adjacent event: shop accounts read this feed.
-- Postgres cannot append to a CHECK, so the whole list is restated. It is V12's
-- list plus INVOICED - V12 is the migration that last touched this constraint,
-- and COMEBACK is the action it added. Restating an older copy silently revokes
-- whatever was added since.
ALTER TABLE ticket_activity
    DROP CONSTRAINT activity_action_valid;

ALTER TABLE ticket_activity
    ADD CONSTRAINT activity_action_valid CHECK (action IN ('CREATED', 'STATUS', 'SEVERITY', 'ASSIGNED', 'SERVICES', 'PRICING', 'NOTES', 'PARTS', 'DUE_DATE', 'CUSTOMER', 'LINE_ITEMS', 'BILLING_TYPE', 'COMEBACK', 'INVOICED', 'DELETED'));

