-- Paywall + intake provenance.
--
-- paid_at: set by the Stripe webhook on checkout.session.completed. Null means
-- the report is generated but gated; the server redacts the headline number,
-- top-carrier dollars, and per-code annual gap until this is set. Distinct from
-- stripe_payment_id so "has paid" is a single, explicit timestamp check.
--
-- fee_input_method: which intake method the practice used (csv | xlsx | paste |
-- manual | eob). Persisted for support + analytics on what dentists actually use.

alter table practices
  add column if not exists paid_at timestamptz;

alter table practices
  add column if not exists fee_input_method text
    check (fee_input_method in ('csv','xlsx','paste','manual','eob'));

create index if not exists practices_paid_at_idx on practices (paid_at);
