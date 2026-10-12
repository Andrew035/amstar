-- actual_completion_date now records when the REPAIR finished, not when the
-- invoice was written. The shop marks a car READY_FOR_INVOICE the moment the
-- work is done, so that is when the date is stamped, and invoicing it later
-- must not rewrite it. History then shows when the car was actually finished,
-- which is the date the shop and the customer both care about. Invoice
-- completion is not tracked at all.
--
-- Backfill first: rows marked ready under V15 carry a null date and would fail
-- the tightened constraint. greatest(entry_date, ...) keeps
-- tickets_completed_after_entry satisfied for any ticket whose entry date is
-- later than its last touch.
UPDATE
    service_tickets
SET
    actual_completion_date = greatest (entry_date, coalesce(updated_at::date, CURRENT_DATE))
WHERE
    status = 'READY_FOR_INVOICE'
    AND actual_completion_date IS NULL;

ALTER TABLE service_tickets
    DROP CONSTRAINT tickets_completion_matches_status;

-- Mirrors PriorityQueueService.updateRepairStatus in both directions: the two
-- finished states carry a date, the two open ones do not.
ALTER TABLE service_tickets
    ADD CONSTRAINT tickets_completion_matches_status CHECK ((status IN ('READY_FOR_INVOICE', 'COMPLETED')) = (actual_completion_date IS NOT NULL));

