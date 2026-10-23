-- Name plus number is the identity, not the name. Matching on name alone
-- merged two different people who share one, and this app bills nobody, so
-- nothing downstream would have caught it.
--
-- Partial, because a null phone is normal: the shop often has no number at
-- drop-off, and Postgres lets any number of (name, null) rows coexist. The
-- application fills the blank record rather than making another.
CREATE UNIQUE INDEX uq_customer_name_phone ON customers (lower(full_name), regexp_replace(phone, '\D', '', 'g'))
WHERE
    phone IS NOT NULL;

