-- ticket_label is a snapshot written at the time of the event, so changing the
-- separator in ActivityService only affects rows written from now on. Every
-- event already in the table still reads "2010 FORD E-250 — Kane" in the
-- dashboard feed. Rewrite them once so the feed is consistent.
UPDATE
    ticket_activity
SET
    ticket_label = replace(ticket_label, ' — ', ' · ')
WHERE
    ticket_label LIKE '% — %';

