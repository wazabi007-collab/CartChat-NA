# Meta templates to paste in — engagement + reply forwarding

Create these four in Meta Business Suite -> WhatsApp Manager -> Message
templates. Category **Utility**, language **English** (code `en`) — same as
every existing OshiCart template.

House style, matched to the live templates: leading emoji, "Hi {{1}}," one
short paragraph, "Tap below to ..." closing, links as **buttons** with fixed
URLs, **no footers**.

The cron and webhook are already deployed. The moment a template flips to
Active its messages start flowing; until then failed sends retry quietly,
once a day, and nobody sees anything.

---

## 1. `store_activation_nudge`

**Body:**
```
🛒 Hi {{1}}, your OshiCart store is live but has no products yet, so customers cannot find it in Browse Stores. Adding your first product takes about 2 minutes. Tap below for the step-by-step guide.
```
**Button:** Open the Guide — `https://oshicart.com/guide`
**Sample:** {{1}} = Sunrise Crumbs Bakery

---

## 2. `store_win_back`

**Body:**
```
🔓 Hi {{1}}, your OshiCart store is paused, not deleted. Your products, your store link and your QR code are all still saved. Tap below to log in and bring it back online in minutes.
```
**Button:** Log In — `https://oshicart.com/login`
**Sample:** {{1}} = Kiti's Kitchen

---

## 3. `booking_reminder`

**Body:**
```
📅 Hi {{1}}, a reminder of your appointment at {{2}} tomorrow, {{3}} at {{4}}. If you cannot make it, tap below and let the store know on WhatsApp so the time can go to someone else.
```
**Button:** Open Store — `https://oshicart.com/s/{{1}}` (dynamic — add a
variable to the button URL; the app sends the store's slug)
**Samples:** {{1}} = Maria · {{2}} = Design Today · {{3}} = Tuesday 11 August
· {{4}} = 10:00 · button {{1}} = design-today

---

## 4. `inbound_message_alert`

Forwards replies to the OshiCart business number — which nobody attends — to
the admin phones in `OSHICART_ADMIN_WHATSAPP_NUMBERS` (+264812384424).

**Body:**
```
💬 New WhatsApp reply to the OshiCart number from {{1}} ({{2}}): {{3}}. Reply to them directly on their number, not to this message.
```
**Button:** none
**Samples:** {{1}} = Maria N. · {{2}} = +264811234567 · {{3}} = Hi, I need
help adding my first product
