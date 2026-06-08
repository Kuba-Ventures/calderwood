-- Make practices.email unique.
--
-- upsertPractice() (the /api/onboard + seed path) does
-- `.upsert(..., { onConflict: "email" })`, which Postgres rejects unless a
-- unique constraint/index exists on email. 0001 only created a NON-unique index
-- (practices_email_idx), so every real onboard submit failed at the practice
-- insert — after the auth user was already created — leaving orphaned accounts
-- with no practice. One practice per email is also the intended model.

create unique index if not exists practices_email_key on practices (email);
