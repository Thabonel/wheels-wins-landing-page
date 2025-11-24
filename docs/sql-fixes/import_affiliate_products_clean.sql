-- Clean Import for Affiliate Products (Amazon)
-- Usage: Run after purge to reload a deduplicated, consistent dataset
-- - Builds affiliate_url from ASIN with tag unimogcommuni-22
-- - Keeps schema simple (no regional_* json during initial load)
-- - Safe to re-run after TRUNCATE (will just insert again)

BEGIN;

WITH rows AS (
  SELECT * FROM (
    VALUES
      -- title, description, short_description, category, price, currency, image_url, asin, is_featured, is_active, tags, sort_order
      ('Uharbour Tire Inflation Deflation Kit', 'Professional tire pressure management system with equalizer. Essential for off-road terrain adjustments.', NULL, 'tools_maintenance', 79.99, 'AUD', 'https://m.media-amazon.com/images/I/71x7yRtqbcL._AC_SX522_.jpg', 'B0DDK8M3CV', false, true, ARRAY['tire','inflation','deflation','pressure']::text[], 0),
      ('Automatic Adjustable Tire Pressure Gauge Tire Air Deflators', 'This is what I use, cheap and works great.', NULL, 'recovery_gear', 29.80, 'AUD', 'https://m.media-amazon.com/images/I/712WQqrEMfL._SX522_.jpg', 'B01N5JT4FQ', false, true, NULL, 1),
      ('Adjustable Tire Deflator Auto-Stop (10-40 PSI)', 'DORNATA''s Tire Deflator Valve Stem Kit allows for adjustable air pressure. The valve stem is clearly marked with 10 PSI-40PSI air pressure graduations in 5PSI intervals, simply twist the metal ring to adjust the air pressure as needed.', NULL, 'tools_maintenance', 76.67, 'AUD', 'https://m.media-amazon.com/images/I/71zdRgmniUL._AC_SX679_.jpg', 'B0CY2C6LPW', false, true, NULL, 2),
      ('Telescoping Ladders, 3.9M Carbon Steel Extension Ladder, Heavy Duty 330lbs Capacity', 'Telescoping Ladder with Unmatched Stability: Engineered with 2 reinforced triangular braces, our extendable ladder slashes wobble by 60% vs. competitors, holding steady at a 10° sway even at full 12.8ft (390cm) height.', NULL, 'tools_maintenance', 84.90, 'AUD', 'https://m.media-amazon.com/images/I/71ESSfEhPgL._AC_SX522_.jpg', 'B0DT6P3ZWZ', false, true, NULL, 3),
      ('Flush Mount Water Tank Gauge. Real-Time', '', NULL, 'parts_upgrades', 165.00, 'AUD', 'https://m.media-amazon.com/images/I/61WGfFemRbL._SL1500_.jpg', 'B09F2VLQ9Q', false, true, NULL, 4),
      ('2 Pcs Van Storage Cargo Net', '', NULL, 'camping_expedition', 17.69, 'AUD', 'https://m.media-amazon.com/images/I/71oJGbIz86L._AC_SL1500_.jpg', 'B09DYKBGP2', false, true, NULL, 5),
      ('4 Pack Waterproof RV Hose Storage Bags', '', NULL, 'tools_maintenance', 33.99, 'AUD', 'https://m.media-amazon.com/images/I/7187YjFwBEL._AC_SL1500_.jpg', 'B0CJGB8SLH', false, true, NULL, 6),
      ('2x Spirit Level Bubble Leveler', '', NULL, 'parts_upgrades', 7.59, 'AUD', 'https://m.media-amazon.com/images/I/61VCAiEniRL._AC_SL1500_.jpg', 'B09TDBLG71', false, true, NULL, 7),
      ('Wireless smart security camera, two-year battery life', '', NULL, 'electronics', 132.00, 'AUD', 'https://m.media-amazon.com/images/I/41gjoN8DVHL._SL1000_.jpg', 'B0D4828MSK', false, true, NULL, 8),
      ('Solar Backup Camera Wireless with Strong Magnet attacment', '', NULL, 'electronics', 269.99, 'AUD', 'https://m.media-amazon.com/images/I/71tVfONLQKL._AC_SL1500_.jpg', 'B0DWK6Y951', false, true, NULL, 9),
      ('4 Gang Wireless Switch Panel, Control Offroad Lights', '', NULL, 'parts_upgrades', 78.99, 'AUD', 'https://m.media-amazon.com/images/I/817HqdkM9PL._SL1500_.jpg', 'B0F1F4XZ6B', false, true, NULL, 10),
      ('Wireless Carplay & Android Auto Car Stereo with Dash Cam, Portable 9" HD Touchscreen, 4K Front & Backup Camera, Loop Recording', '', NULL, 'parts_upgrades', 191.99, 'AUD', 'https://m.media-amazon.com/images/I/71JrNos6PrL._AC_SL1500_.jpg', 'B0CPXLG2G3', false, true, NULL, 11),
      ('7'' Portable Wireless Apple CarPlay & Android Auto Touch Screen', '', NULL, 'electronics', 84.99, 'AUD', 'https://m.media-amazon.com/images/I/71eS8bBBzVL._AC_SX679_.jpg', 'B0DLNXGNHJ', false, true, NULL, 12),
      ('Portable Camping Chair', '', NULL, 'camping_expedition', 39.99, 'USD', 'https://m.media-amazon.com/images/I/61jyxBvNI9L._AC_SX679_.jpg', 'B0DLNQQVSC', false, true, NULL, 13),
      ('Ultralight Portable Camping Chair', '', NULL, 'camping_expedition', 43.84, 'AUD', 'https://m.media-amazon.com/images/I/71LDtQ6wVBL._AC_SX679_.jpg', 'B07NT77GT8', false, true, NULL, 14),
      ('Padded Folding Outdoor Camping Chair with Bag', '', NULL, 'camping_expedition', 59.90, 'AUD', 'https://m.media-amazon.com/images/I/915A43TgRqL._AC_SX679_.jpg', 'B074YRN642', false, true, NULL, 15),
      ('Magnetic Gas Level Indicator', '', NULL, 'camping_expedition', 16.47, 'AUD', 'https://m.media-amazon.com/images/I/81nw80S0lsL._AC_SL1500_.jpg', 'B0DHLJV1B2', false, true, NULL, 16),
      ('Propane Splitter with Gauge', '', NULL, 'camping_expedition', 35.69, 'AUD', 'https://m.media-amazon.com/images/I/71P9-MmoPLL._AC_SX679_.jpg', 'B0D6G9J7FY', false, true, NULL, 17),
      ('Camp Stove with Carrying Case', '', NULL, 'outdoor_gear', 87.99, 'AUD', 'https://m.media-amazon.com/images/I/71zJT8jt5vL._AC_SX679_.jpg', 'B0FGH9WLZT', false, true, NULL, 18),
      ('Ferro Rod Flint Fire Starter', '', NULL, 'camping_expedition', 17.79, 'AUD', 'https://m.media-amazon.com/images/I/51v1CobcqWL._AC_SX679_.jpg', 'B0DFH4SWNV', false, true, NULL, 19),
      ('Swivel Campfire Grill Heavy Duty Steel Grate', '', NULL, 'camping_expedition', 109.18, 'AUD', 'https://m.media-amazon.com/images/I/81IdSEpKVDL._AC_SX679_.jpg', 'B08L3835L9', false, true, NULL, 20)
      -- TODO: Continue listing remaining products (21..81) following the same pattern
  ) AS t(title, description, short_description, category, price, currency, image_url, asin, is_featured, is_active, tags, sort_order)
)
INSERT INTO public.affiliate_products (
  title, description, short_description, category, price, currency,
  image_url, affiliate_provider, affiliate_url, is_featured, is_active,
  tags, sort_order, asin, commission_rate
)
SELECT
  r.title,
  NULLIF(r.description, '') AS description,
  r.short_description,
  r.category::product_category,
  r.price,
  r.currency,
  r.image_url,
  'amazon'::affiliate_provider,
  'https://www.amazon.com/dp/' || r.asin || '?tag=unimogcommuni-22' AS affiliate_url,
  r.is_featured,
  r.is_active,
  COALESCE(r.tags, ARRAY[]::text[]),
  COALESCE(r.sort_order, 0),
  r.asin,
  4.50::numeric AS commission_rate
FROM rows r;

-- Verification
SELECT 'Imported products' AS status, COUNT(*) AS total FROM public.affiliate_products;

COMMIT;

-- Notes:
-- - Add the remaining products 21..81 into the VALUES list above.
-- - To set AU/US regional URLs later, backfill regional_urls as a separate step.

