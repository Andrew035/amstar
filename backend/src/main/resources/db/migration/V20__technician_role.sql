-- TECHNICIAN as a third role, and the roster link that gives it a face.
-- The list is taken from V14, the migration that last touched this
-- constraint. Postgres cannot append to a CHECK, so a restatement built from
-- an older migration would silently revoke BOOKKEEPER.
ALTER TABLE users
    DROP CONSTRAINT users_role_valid;

ALTER TABLE users
    ADD CONSTRAINT users_role_valid CHECK (ROLE IN ('ADMIN', 'BOOKKEEPER', 'TECHNICIAN'));

-- A roster name optionally points at an account. `on delete set null` so
-- removing an account leaves the roster entry intact: the person still wored
-- here, and their name is still on past tickets.
ALTER TABLE technicians
    ADD COLUMN user_id bigint REFERENCES users (id) ON DELETE SET NULL;

CREATE UNIQUE INDEX uq_technician_user ON technicians (user_id)
WHERE
    user_id IS NOT NULL;

-- An invite is "set your first password", which is the reset mechanic exactly.
-- Reusing the table rather than adding one keeps a single expiry, single-use
-- and purge path. `purpose` is what stops an invite token being redeemed at
-- /reset-password, which would set a password while leaving the account
-- inactive - a confusing dead end rather than a vulnarability.
ALTER TABLE password_reset_tokens
    ADD COLUMN purpose varchar(16) NOT NULL DEFAULT 'RESET';

ALTER TABLE password_reset_tokens
    ADD CONSTRAINT reset_tokens_purpose_valid CHECK (purpose IN ('RESET', 'INVITE'));

