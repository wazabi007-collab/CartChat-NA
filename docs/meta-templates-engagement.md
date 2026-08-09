# Meta templates to paste in — engagement messages

Create these three in Meta Business Suite → WhatsApp Manager → Message
templates, exactly as below (category **UTILITY**, language **English**).
The cron is already deployed and sending is claim-once — the moment Meta
approves a template, its messages start going out; until then failed sends
are logged and never retried at the same person.

---

## 1. `store_activation_nudge`

**Header:** none
**Body:**
```
Hi {{1}}! Your OshiCart store is ready, but it has nothing to sell yet — so customers can't find it in Browse Stores.

Adding your first product takes about 2 minutes. Step-by-step guide: {{2}}

Reply here if you're stuck and we'll help you set it up.
```
**Footer:** OshiCart — zero commission
**Sample values:** {{1}} Sunrise Crumbs Bakery · {{2}} https://oshicart.com/guide

---

## 2. `store_win_back`

**Header:** none
**Body:**
```
Hi {{1}}, your OshiCart store is paused — not deleted. Your products, your store link and your QR code are all still saved.

Log in and it's back online in minutes: {{2}}

Need a hand or have questions? Just reply to this message.
```
**Footer:** OshiCart — zero commission
**Sample values:** {{1}} Kiti's Kitchen · {{2}} https://oshicart.com/login

---

## 3. `booking_reminder`

**Header:** none
**Body:**
```
Hi {{1}}! A reminder of your appointment at {{2}} tomorrow, {{3}} at {{4}}.

If you can't make it, please let the store know on WhatsApp so the time can go to someone else.
```
**Footer:** Booked through OshiCart
**Sample values:** {{1}} Maria · {{2}} Design Today · {{3}} Tuesday 11 August · {{4}} 10:00
