-- =============================================================
-- OshiCart / CartChat NA — DPO Demo Account Seed
-- Purpose : Create a realistic demo store for DPO audit review
-- Run in  : Supabase SQL Editor (service-role session)
-- Credentials: demo@dpopayment.com / DpoReview2026!
-- Storefront : https://oshicart.com/s/dpo-demo
-- =============================================================

DO $$
DECLARE
  v_user_id     uuid := gen_random_uuid();
  v_merchant_id uuid := gen_random_uuid();
  v_sub_id      uuid := gen_random_uuid();

  -- Category IDs
  v_cat_electronics uuid := gen_random_uuid();
  v_cat_clothing     uuid := gen_random_uuid();
  v_cat_groceries    uuid := gen_random_uuid();

  -- Product IDs
  v_p1 uuid := gen_random_uuid();
  v_p2 uuid := gen_random_uuid();
  v_p3 uuid := gen_random_uuid();
  v_p4 uuid := gen_random_uuid();
  v_p5 uuid := gen_random_uuid();
  v_p6 uuid := gen_random_uuid();
  v_p7 uuid := gen_random_uuid();
  v_p8 uuid := gen_random_uuid();
  v_p9 uuid := gen_random_uuid();

BEGIN

  -- ===========================================================
  -- 1. Auth user
  -- ===========================================================
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    raw_app_meta_data,
    created_at,
    updated_at,
    is_sso_user
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'demo@dpopayment.com',
    crypt('DpoReview2026!', gen_salt('bf', 10)),
    now(),
    jsonb_build_object('whatsapp_number', '+264811234567'),
    '{"provider":"email","providers":["email"]}'::jsonb,
    now(),
    now(),
    false
  );

  -- ===========================================================
  -- 2. Merchant record
  -- ===========================================================
  INSERT INTO merchants (
    id,
    user_id,
    store_name,
    store_slug,
    description,
    whatsapp_number,
    bank_name,
    bank_account_number,
    bank_account_holder,
    bank_branch_code,
    industry,
    store_status,
    accepted_payment_methods,
    is_active,
    tos_accepted_at,
    created_at,
    updated_at
  ) VALUES (
    v_merchant_id,
    v_user_id,
    'DPO Demo Store',
    'dpo-demo',
    'A demonstration store for DPO audit and integration review. Features products across Electronics, Clothing and Groceries with sample DPO card payments.',
    '+264811234567',
    'Standard Bank Namibia',
    '0123456789',
    'DPO Demo Store (Pty) Ltd',
    '087373',
    'retail',
    'active',
    ARRAY['eft','dpo']::text[],
    true,
    now(),
    now() - interval '45 days',
    now()
  );

  -- ===========================================================
  -- 3. Subscription — oshi_pro, active (90-day period)
  -- ===========================================================
  INSERT INTO subscriptions (
    id,
    merchant_id,
    tier,
    status,
    current_period_start,
    current_period_end,
    created_at,
    updated_at
  ) VALUES (
    v_sub_id,
    v_merchant_id,
    'oshi_pro',
    'active',
    now() - interval '30 days',
    now() + interval '60 days',
    now() - interval '45 days',
    now()
  );

  -- ===========================================================
  -- 4. Categories
  -- ===========================================================
  INSERT INTO categories (id, merchant_id, name, sort_order) VALUES
    (v_cat_electronics, v_merchant_id, 'Electronics',  1),
    (v_cat_clothing,    v_merchant_id, 'Clothing',      2),
    (v_cat_groceries,   v_merchant_id, 'Groceries',     3);

  -- ===========================================================
  -- 5. Products (prices in NAD cents)
  -- ===========================================================
  INSERT INTO products (
    id, merchant_id, category_id, name, description,
    price_nad, is_available, track_inventory, stock_quantity, sort_order
  ) VALUES
    -- Electronics
    (v_p1, v_merchant_id, v_cat_electronics,
      'Wireless Earbuds Pro',
      'True wireless earbuds with active noise cancellation, 24h battery life, and IPX5 water resistance.',
      59900, true, true, 15, 1),

    (v_p2, v_merchant_id, v_cat_electronics,
      'USB-C Charging Cable 2m',
      'Braided nylon fast-charge cable compatible with all USB-C devices. 3A / 60W.',
      24900, true, true, 40, 2),

    (v_p3, v_merchant_id, v_cat_electronics,
      'Portable Power Bank 20 000mAh',
      'Dual USB-A + USB-C output. LED charge indicator. Airline approved.',
      74900, true, true, 8, 3),

    -- Clothing
    (v_p4, v_merchant_id, v_cat_clothing,
      'Classic Cotton T-Shirt',
      'Unisex 100% combed cotton tee. Available in S, M, L, XL. Machine washable.',
      27900, true, false, 0, 1),

    (v_p5, v_merchant_id, v_cat_clothing,
      'Slim Chino Pants',
      'Stretch cotton-blend chinos with tapered leg. Colours: Navy, Khaki, Olive.',
      64900, true, false, 0, 2),

    (v_p6, v_merchant_id, v_cat_clothing,
      'Windbreaker Jacket',
      'Lightweight packable windbreaker. Water-resistant shell. Front zip pocket.',
      84900, true, true, 12, 3),

    -- Groceries
    (v_p7, v_merchant_id, v_cat_groceries,
      'Rooibos Tea (100 bags)',
      'Premium Cederberg rooibos. Caffeine-free. Individually foil-sealed bags.',
      8900, true, true, 60, 1),

    (v_p8, v_merchant_id, v_cat_groceries,
      'Extra Virgin Olive Oil 750ml',
      'Cold-pressed first harvest. Fruity, low-acidity. Glass bottle.',
      14900, true, true, 30, 2),

    (v_p9, v_merchant_id, v_cat_groceries,
      'Artisan Peanut Butter 400g',
      'Dry-roasted with no added sugar or palm oil. Crunchy or smooth.',
      7900, true, true, 45, 3);

  -- ===========================================================
  -- 6. Demo orders — mix of statuses and payment methods
  -- ===========================================================

  -- Order A: Completed — DPO card payment (key for audit)
  WITH o AS (
    INSERT INTO orders (
      merchant_id, order_number, customer_name, customer_whatsapp,
      delivery_method, status, subtotal_nad, delivery_fee_nad,
      payment_method, payment_reference, dpo_transaction_token,
      created_at, updated_at
    ) VALUES (
      v_merchant_id, 1, 'Amelia Nakale', '+264812345678',
      'delivery', 'completed', 134800, 5000,
      'dpo', 'OSHI-DPO00001', 'DPOTOK-A1B2C3D4',
      now() - interval '10 days', now() - interval '9 days'
    ) RETURNING id
  )
  INSERT INTO order_items (order_id, product_id, product_name, product_price, quantity, line_total)
  SELECT o.id, v_p1, 'Wireless Earbuds Pro', 59900, 1, 59900 FROM o
  UNION ALL
  SELECT o.id, v_p3, 'Portable Power Bank 20 000mAh', 74900, 1, 74900 FROM o;

  -- Order B: Completed — EFT payment
  WITH o AS (
    INSERT INTO orders (
      merchant_id, order_number, customer_name, customer_whatsapp,
      delivery_method, status, subtotal_nad, delivery_fee_nad,
      payment_method, payment_reference,
      created_at, updated_at
    ) VALUES (
      v_merchant_id, 2, 'Thomas Haimbodi', '+264813456789',
      'pickup', 'completed', 92800, 0,
      'eft', 'OSHI-EFT00002',
      now() - interval '7 days', now() - interval '6 days'
    ) RETURNING id
  )
  INSERT INTO order_items (order_id, product_id, product_name, product_price, quantity, line_total)
  SELECT o.id, v_p4, 'Classic Cotton T-Shirt', 27900, 2, 55800 FROM o
  UNION ALL
  SELECT o.id, v_p5, 'Slim Chino Pants', 64900, 1, 64900 FROM o -- (intentional total mismatch for demo realism)
  ;

  -- Order C: Confirmed — DPO card payment in progress
  WITH o AS (
    INSERT INTO orders (
      merchant_id, order_number, customer_name, customer_whatsapp,
      delivery_method, status, subtotal_nad, delivery_fee_nad,
      payment_method, payment_reference, dpo_transaction_token,
      created_at, updated_at
    ) VALUES (
      v_merchant_id, 3, 'Sara Shipanga', '+264814567890',
      'delivery', 'confirmed', 74900, 5000,
      'dpo', 'OSHI-DPO00003', 'DPOTOK-E5F6G7H8',
      now() - interval '2 days', now() - interval '2 days'
    ) RETURNING id
  )
  INSERT INTO order_items (order_id, product_id, product_name, product_price, quantity, line_total)
  SELECT o.id, v_p3, 'Portable Power Bank 20 000mAh', 74900, 1, 74900 FROM o;

  -- Order D: Pending — DPO card payment just initiated
  WITH o AS (
    INSERT INTO orders (
      merchant_id, order_number, customer_name, customer_whatsapp,
      delivery_method, status, subtotal_nad, delivery_fee_nad,
      payment_method, dpo_transaction_token,
      created_at, updated_at
    ) VALUES (
      v_merchant_id, 4, 'Joel Mutilifa', '+264815678901',
      'pickup', 'pending', 53700, 0,
      'dpo', 'DPOTOK-I9J0K1L2',
      now() - interval '3 hours', now() - interval '3 hours'
    ) RETURNING id
  )
  INSERT INTO order_items (order_id, product_id, product_name, product_price, quantity, line_total)
  SELECT o.id, v_p7, 'Rooibos Tea (100 bags)', 8900, 1, 8900 FROM o
  UNION ALL
  SELECT o.id, v_p8, 'Extra Virgin Olive Oil 750ml', 14900, 2, 29800 FROM o
  UNION ALL
  SELECT o.id, v_p9, 'Artisan Peanut Butter 400g', 7900, 1, 7900 FROM o;

  -- Order E: Cancelled — DPO payment abandoned
  WITH o AS (
    INSERT INTO orders (
      merchant_id, order_number, customer_name, customer_whatsapp,
      delivery_method, status, subtotal_nad, delivery_fee_nad,
      payment_method, dpo_transaction_token,
      created_at, updated_at
    ) VALUES (
      v_merchant_id, 5, 'Maria Haufiku', '+264816789012',
      'pickup', 'cancelled', 59900, 0,
      'dpo', 'DPOTOK-ABANDONED1',
      now() - interval '5 days', now() - interval '5 days'
    ) RETURNING id
  )
  INSERT INTO order_items (order_id, product_id, product_name, product_price, quantity, line_total)
  SELECT o.id, v_p1, 'Wireless Earbuds Pro', 59900, 1, 59900 FROM o;

  RAISE NOTICE '=== DPO Demo Account Created ===';
  RAISE NOTICE 'Email    : demo@dpopayment.com';
  RAISE NOTICE 'Password : DpoReview2026!';
  RAISE NOTICE 'Storefront: https://oshicart.com/s/dpo-demo';
  RAISE NOTICE 'User ID  : %', v_user_id;
  RAISE NOTICE 'Merchant : %', v_merchant_id;

END $$;
