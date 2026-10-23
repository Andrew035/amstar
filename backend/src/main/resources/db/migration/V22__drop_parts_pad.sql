-- The parts pad is gone. PartsEditor and ticket_line_items replaced it: free
-- text could never become an invoice line, so anything recorded only there was
-- invisible to pricing and would have been invisible to QuickBooks too.
ALTER TABLE service_tickets
    DROP CONSTRAINT tickets_parts_length;

ALTER TABLE service_tickets
    DROP COLUMN parts;

-- 'PARTS' deliberately stays in activity_action_valid. Rows recording that
-- someone edited the pad are historical facts, and a CHECK is validated
-- against existing rows when it is added - removing the value would make this
-- migration fail on any database where the pad was ever used.
