# Namibia-First Industry Taxonomy — Signup Dropdown

> Generated: 2026-03-11 | Purpose: Personalize merchant onboarding by industry

## Industry Dropdown (28 categories + Other)

| # | Value (DB) | Display Label | Icon | Example Businesses |
|---|-----------|---------------|------|--------------------|
| 1 | `grocery` | Grocery & Supermarket | 🛒 | Spar, Pick n Pay, tuck shops |
| 2 | `butchery` | Butchery & Meat | 🥩 | Windhoek butcheries, biltong shops |
| 3 | `bakery` | Bakery & Confectionery | 🍞 | Bread, cakes, pastries |
| 4 | `restaurant` | Restaurant & Dining | 🍽️ | Sit-down restaurants, buffets |
| 5 | `takeaway` | Takeaway & Fast Food | 🍔 | Kapana stands, fish & chips, street food |
| 6 | `cafe` | Coffee Shop & Cafe | ☕ | Cafes, juice bars |
| 7 | `liquor` | Liquor & Beverages | 🍺 | Bottle stores, shebeen supplies |
| 8 | `pharmacy` | Pharmacy & Health | 💊 | Pharmacies, health shops |
| 9 | `fashion` | Fashion & Clothing | 👗 | Boutiques, tailors, second-hand clothing |
| 10 | `salon` | Salon & Beauty | 💇 | Hair salons, barbers, nail techs |
| 11 | `cosmetics` | Cosmetics & Skincare | 💄 | Beauty products, skincare brands |
| 12 | `electronics` | Electronics & Phones | 📱 | Phone shops, accessories, repairs |
| 13 | `hardware` | Hardware & Building | 🔨 | Building materials, plumbing, electrical |
| 14 | `auto_parts` | Auto Parts & Accessories | 🚗 | Car parts, tyres, accessories |
| 15 | `agriculture` | Agriculture & Farming | 🌾 | Seeds, fertilizer, animal feed, farm equipment |
| 16 | `crafts` | Arts, Crafts & Curios | 🎨 | Namibian crafts, curios, art galleries |
| 17 | `furniture` | Furniture & Home | 🛋️ | Furniture shops, home decor |
| 18 | `stationery` | Stationery & Office | 📎 | Office supplies, printing, school supplies |
| 19 | `pet` | Pet Supplies | 🐾 | Pet food, accessories, vet supplies |
| 20 | `sports` | Sports & Outdoor | ⚽ | Sporting goods, camping, fitness |
| 21 | `toys` | Toys & Kids | 🧸 | Toy shops, baby supplies, kids clothing |
| 22 | `catering` | Catering & Events | 🎪 | Catering services, event supplies |
| 23 | `cleaning` | Cleaning & Laundry | 🧹 | Cleaning products, laundry services |
| 24 | `printing` | Printing & Signage | 🖨️ | T-shirt printing, banners, signage |
| 25 | `gas_water` | Gas & Water | 🔥 | Gas refills, water delivery |
| 26 | `flowers` | Florist & Gifts | 💐 | Flower shops, gift baskets |
| 27 | `general_dealer` | General Dealer & Wholesale | 🏪 | General dealers, wholesale suppliers |
| 28 | `services` | Services & Repairs | 🔧 | Handyman, appliance repair, IT services |
| 29 | `other` | Other (specify) | 📦 | Free text input shown when selected |

---

## How Industry Selection Personalizes Defaults

### 1. Sample Product Templates

When a merchant selects an industry during signup, pre-populate their catalog with 3-5 sample products they can edit or delete.

| Industry | Sample Products |
|----------|----------------|
| `grocery` | Maize Meal 2.5kg (N$49.99), Sugar 2kg (N$34.99), Cooking Oil 750ml (N$29.99), Rice 2kg (N$39.99), Bread White (N$17.99) |
| `butchery` | Beef Mince 500g (N$54.99), Boerewors 1kg (N$89.99), Chicken Braai Pack (N$69.99), Biltong 250g (N$79.99) |
| `bakery` | White Bread Loaf (N$17.99), Birthday Cake (N$249.99), Vetkoek x6 (N$29.99), Cupcakes x12 (N$89.99) |
| `takeaway` | Kapana Portion (N$30.00), Fish & Chips (N$49.99), Burger & Chips (N$59.99), Pap & Vleis (N$45.00) |
| `fashion` | T-Shirt (N$149.99), Dress (N$299.99), Jeans (N$349.99), Sneakers (N$499.99) |
| `salon` | Haircut (N$80.00), Braids (N$350.00), Relaxer Treatment (N$250.00), Nail Set (N$200.00) |
| `electronics` | Phone Screen Protector (N$49.99), USB Cable (N$39.99), Earphones (N$99.99), Phone Case (N$79.99) |
| `pharmacy` | Panado 24s (N$29.99), Vitamin C 30s (N$59.99), Hand Sanitizer 250ml (N$34.99) |
| `agriculture` | Maize Seed 10kg (N$189.99), Fertilizer 25kg (N$349.99), Chicken Feed 50kg (N$299.99) |
| `hardware` | Cement 50kg (N$129.99), Paint 5L (N$249.99), PVC Pipe 4m (N$89.99) |
| `auto_parts` | Engine Oil 5L (N$249.99), Brake Pads Set (N$349.99), Car Battery (N$1299.99) |
| *other industries* | 3 generic: "Sample Product 1" (N$99.99), "Sample Product 2" (N$149.99), "Sample Product 3" (N$199.99) |

**Implementation**: Store templates as JSON seed data. On merchant creation, if industry is set, insert sample products. Mark with `is_sample: true` so merchant knows to edit/delete.

### 2. Order Settings Defaults

| Industry | Default Delivery Method | Allow Scheduling | Notes Placeholder |
|----------|------------------------|-----------------|-------------------|
| `grocery` | Both (pickup + delivery) | Yes | "Delivery address & preferred time" |
| `butchery` | Both | No | "Any special cuts needed?" |
| `takeaway` | Both | No | "Any dietary requirements?" |
| `restaurant` | Both | Yes | "Number of guests / table preference" |
| `salon` | Pickup only | Yes | "Preferred stylist / service notes" |
| `catering` | Delivery only | Yes | "Event date, venue, number of guests" |
| `pharmacy` | Both | No | "Prescription details if applicable" |
| `hardware` | Both | Yes | "Delivery address (heavy items)" |
| `agriculture` | Delivery only | Yes | "Farm location / delivery instructions" |
| `services` | Pickup only | Yes | "Describe issue / service needed" |
| *default* | Both | No | "Special instructions" |

### 3. Delivery/Pickup Defaults

| Industry | Default Pickup Label | Default Delivery Fee Suggestion |
|----------|---------------------|---------------------------------|
| `grocery` | "Collect from store" | N$30.00 |
| `takeaway` | "Collect at counter" | N$20.00 |
| `butchery` | "Collect from shop" | N$30.00 |
| `pharmacy` | "Collect at pharmacy" | N$25.00 |
| `hardware` | "Collect from yard" | N$80.00 (heavy items) |
| `agriculture` | "Collect from depot" | N$100.00 (bulk/heavy) |
| `furniture` | "Collect from showroom" | N$150.00 |
| `salon` | "Visit salon" | N/A (service-based) |
| *default* | "Pickup" | N$30.00 |

### 4. WhatsApp Message Templates

Pre-filled WhatsApp deep link messages customized by industry:

**Order Confirmation (merchant → customer):**
| Industry | Template |
|----------|----------|
| `takeaway` | "Hi {customer}! Your order #{number} is confirmed. We're preparing your food now. Total: {total}. Collect in ~20 min or we'll deliver shortly!" |
| `grocery` | "Hi {customer}! Order #{number} confirmed. We're packing your items. Total: {total}. {delivery_info}" |
| `salon` | "Hi {customer}! Your booking #{number} is confirmed for {date} at {time}. See you then!" |
| `hardware` | "Hi {customer}! Order #{number} confirmed. Total: {total}. Heavy items — please bring a bakkie for pickup or we'll arrange delivery." |
| *default* | "Hi {customer}! Your order #{number} is confirmed. Total: {total}. {delivery_info}" |

**Order Ready (merchant → customer):**
| Industry | Template |
|----------|----------|
| `takeaway` | "Your order #{number} is ready! Come collect at the counter." |
| `grocery` | "Your order #{number} is packed and ready for collection/delivery." |
| `pharmacy` | "Your order #{number} is ready for collection at the pharmacy." |
| *default* | "Your order #{number} is ready! {delivery_info}" |

---

## Database Schema Addition

```sql
-- Add industry column to merchants table
ALTER TABLE merchants ADD COLUMN industry text DEFAULT 'other';

-- Optional: Create lookup table for industry metadata
CREATE TABLE industry_templates (
  industry text PRIMARY KEY,
  display_name text NOT NULL,
  icon text,
  default_delivery_method delivery_method DEFAULT 'pickup',
  allow_scheduling boolean DEFAULT false,
  notes_placeholder text DEFAULT 'Special instructions',
  delivery_fee_suggestion integer DEFAULT 3000, -- cents
  sample_products jsonb DEFAULT '[]'::jsonb
);
```

## Signup Flow Change

Current: Email → OTP → Store Setup (name, description, WhatsApp, bank)

**New**: Email → OTP → **Industry Selection** → Store Setup (name, description, WhatsApp, bank)

Industry selection is a single dropdown between OTP verification and store setup. One screen, one choice, instant personalization.

---

## Assumptions

1. Industry list based on observed Namibian SME landscape (Windhoek, Oshakati, Walvis Bay, smaller towns)
2. Sample product prices are approximate Namibian market rates (March 2026)
3. Templates are suggestions — merchant can always change everything
4. "Other" with free text covers edge cases without bloating the dropdown
5. Industry data informs future features: industry-specific analytics, benchmarking, targeted marketing
