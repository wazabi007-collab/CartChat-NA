-- Migration 085: WayaMe instant payments
--
-- WayaMe is the Bank of Namibia's national instant payment system (operated by
-- Instant Payments Namibia, built on the UPI technology stack). It went live in
-- June 2026 for government disbursements; person-to-person and merchant
-- payments follow in the next phase.
--
-- It needs no API integration on our side. Like every other method OshiCart
-- supports, the merchant publishes an identifier and the buyer pays it from
-- their own banking app -- so the column below is all the platform needs to be
-- ready the day consumer P2P is switched on.
--
-- The identifier is a phone number (the WayaMe alias), kept as free text rather
-- than reusing whatsapp_number: a merchant may well take payment on a different
-- number from the one they answer customers on, and conflating the two silently
-- publishes the wrong one.

-- payment_method is a Postgres ENUM, so the database rejects an unknown value
-- outright. Without this the storefront could offer WayaMe, the buyer could
-- select it, and place_order would fail at the last step of checkout with an
-- enum error -- after the customer had filled in everything.
alter type payment_method add value if not exists 'wayame';

alter table merchants
  add column if not exists wayame_number text default null;

comment on column merchants.wayame_number is
  'WayaMe payment alias (phone number) the buyer sends an instant payment to. A payment credential: excluded from the anon/authenticated column grants set in migration 055, readable by the owner through get_my_merchant() and by the service role for checkout and invoice rendering.';

-- Deliberately NO grant to anon.
--
-- Migration 055 revoked table-wide SELECT on merchants and replaced it with an
-- explicit column allow-list, precisely so that a new column is invisible to
-- the public by default instead of being exposed the moment it is added. This
-- column is a payment credential and belongs with bank_account_number and the
-- momo/ewallet/pay2cell/paytoday numbers, none of which anon may read.
--
-- It therefore reaches the two places that legitimately need it without any
-- further grant:
--   * the owning merchant, via get_my_merchant() (SECURITY DEFINER, returns
--     every column of the caller's own row)
--   * checkout and invoice, which render server-side under the service role
--
-- INSERT/UPDATE remain table-wide, so the setup wizard and settings page can
-- write it; RLS still restricts which rows a merchant may write.
