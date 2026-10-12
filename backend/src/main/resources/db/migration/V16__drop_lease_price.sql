-- lease_price and include_lease are vestigial. V11 replaced the retail-vs-lease
-- column pair with billing_type plus ticket_line_items, and converted every
-- include_lease ticket to billing_type = 'WHOLESALE'. Nothing has written these
-- two columns since; the only code still reading them was the legacy total for
-- tickets predating line items, and no ticket in production relies on it.
--
-- The constraint is restated first on purpose. Dropping a column also drops any
-- CHECK that mentions it, including a multi-column one, and Postgres does that
-- without asking. Leaving it implicit would quietly lose the non-negative guard
-- on retail_price and labor_price as well.
UPDATE
    service_tickets
SET
    retail_price = retail_price + lease_price,
    include_retail = TRUE
WHERE
    include_lease
    AND lease_price <> 0;

ALTER TABLE service_tickets
    DROP CONSTRAINT tickets_price_non_negative;

ALTER TABLE service_tickets
    ADD CONSTRAINT tickets_price_non_negative CHECK (retail_price >= 0 AND labor_price >= 0);

ALTER TABLE service_tickets
    DROP COLUMN include_lease;

ALTER TABLE service_tickets
    DROP COLUMN lease_price;

