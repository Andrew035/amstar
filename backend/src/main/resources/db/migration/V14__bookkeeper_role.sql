-- SHOP_VIEW becomes BOOKKEEPER. The shop never wanted a read-only floor
-- account; what it actually needed was an account for the person who writes
-- the invoices. Renaming the role we have beats carrying a third one.
--
-- Note this widens what the non-admin role may see (billing detail), which is
-- why AuthController stops assigning it by default in the same change.
ALTER TABLE users
    DROP CONSTRAINT users_role_valid;

UPDATE
    users
SET
    ROLE = 'BOOKKEEPER'
WHERE
    ROLE = 'SHOP_VIEW';

ALTER TABLE users
    ADD CONSTRAINT users_role_valid CHECK (ROLE IN ('ADMIN', 'BOOKKEEPER'));

-- No default: every account's role is now an explicit decision at registration.
ALTER TABLE users
    ALTER COLUMN ROLE DROP DEFAULT;

-- Tokens carry the role as a claim and live 10 hours, so every existing
-- session still presents 'SHOP_VIEW'. Bumping token_version (V10) forces a
-- fresh sign-in rather than leaving an account holding a role that no longer
-- exists and failing authorization in a way that reads as a bug.
UPDATE
    users
SET
    token_version = token_version + 1;

