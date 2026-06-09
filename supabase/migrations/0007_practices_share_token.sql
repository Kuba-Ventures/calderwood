-- View-only report sharing. A practice can mint a secret share token; anyone
-- with the link (/r/<token>) sees a read-only copy of the report — no login, no
-- account, no access to settings or billing. Null = not shared; revoking sets
-- it back to null.

alter table practices
  add column if not exists share_token text;

create unique index if not exists practices_share_token_key
  on practices (share_token)
  where share_token is not null;
