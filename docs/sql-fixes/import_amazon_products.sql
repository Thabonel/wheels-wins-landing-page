-- Affiliate Products Data Export for Wheels and Wins Project
-- Contains 81 Amazon products with regional pricing data
-- Run this AFTER creating the schema (migrate_to_affiliate_shop.sql)

BEGIN;

-- Insert all 81 products
INSERT INTO affiliate_products (
  title, description, short_description, category, price, currency,
  image_url, affiliate_provider, affiliate_url, is_featured, is_active,
  tags, sort_order, asin, regional_asins, regional_prices, regional_urls, commission_rate
) VALUES

-- Product 1
('Uharbour Tire Inflation Deflation Kit', 'Professional tire pressure management system with equalizer. Essential for off-road terrain adjustments.', NULL, 'tools_maintenance', 79.99, 'AUD', 'https://m.media-amazon.com/images/I/71x7yRtqbcL._AC_SX522_.jpg', 'amazon', 'https://www.amazon.com/dp/B0DDK8M3CV?tag=unimogcommuni-22', false, true, ARRAY['tire','inflation','deflation','pressure'], 0, 'B0DDK8M3CV', '{"AU":"B0DJQF9DY8","US":"B0DDK8M3CV"}'::jsonb, '{"AU":{"amount":169.83,"currency":"AUD"},"US":{"amount":79.99,"currency":"USD","formatted":"USD 79.99"}}'::jsonb, '{"AU":"https://www.amazon.com.au/dp/B0DJQF9DY8?tag=unimogcommuni-22","US":"https://www.amazon.com/dp/B0DDK8M3CV?tag=unimogcommuni-22"}'::jsonb, 4.50),

-- Product 2
('Automatic Adjustable Tire Pressure Gauge Tire Air Deflators', 'This is what I use, cheap and works great.', NULL, 'recovery_gear', 29.80, 'AUD', 'https://m.media-amazon.com/images/I/712WQqrEMfL._SX522_.jpg', 'amazon', 'https://www.amazon.com/dp/B01N5JT4FQ', false, true, ARRAY[]::text[], 1, 'B01N5JT4FQ', NULL, NULL, NULL, NULL),

-- Product 3
('Adjustable Tire Deflator Auto-Stop (10-40 PSI)', 'DORNATA''s Tire Deflator Valve Stem Kit allows for adjustable air pressure. The valve stem is clearly marked with 10 PSI-40PSI air pressure graduations in 5PSI intervals, simply twist the metal ring to adjust the air pressure as needed.', NULL, 'tools_maintenance', 76.67, 'AUD', 'https://m.media-amazon.com/images/I/71zdRgmniUL._AC_SX679_.jpg', 'amazon', 'https://www.amazon.com/dp/B0CY2C6LPW', false, true, ARRAY[]::text[], 2, 'B0CY2C6LPW', NULL, NULL, NULL, NULL),

-- Product 4
('Telescoping Ladders, 3.9M Carbon Steel Extension Ladder, Heavy Duty 330lbs Capacity', 'Telescoping Ladder with Unmatched Stability: Engineered with 2 reinforced triangular braces, our extendable ladder slashes wobble by 60% vs. competitors, holding steady at a 10° sway even at full 12.8ft (390cm) height.', NULL, 'tools_maintenance', 84.90, 'AUD', 'https://m.media-amazon.com/images/I/71ESSfEhPgL._AC_SX522_.jpg', 'amazon', 'https://www.amazon.com/dp/B0DT6P3ZWZ', false, true, ARRAY[]::text[], 3, 'B0DT6P3ZWZ', NULL, NULL, NULL, NULL),

-- Product 5
('Flush Mount Water Tank Gauge. Real-Time', '', NULL, 'parts_upgrades', 165.00, 'AUD', 'https://m.media-amazon.com/images/I/61WGfFemRbL._SL1500_.jpg', 'amazon', 'https://www.amazon.com/dp/B09F2VLQ9Q', false, true, ARRAY[]::text[], 4, 'B09F2VLQ9Q', NULL, NULL, NULL, NULL),

-- Product 6
('2 Pcs Van Storage Cargo Net', '', NULL, 'camping_expedition', 17.69, 'AUD', 'https://m.media-amazon.com/images/I/71oJGbIz86L._AC_SL1500_.jpg', 'amazon', 'https://www.amazon.com/dp/B09DYKBGP2', false, true, ARRAY[]::text[], 5, 'B09DYKBGP2', NULL, NULL, NULL, NULL),

-- Product 7
('4 Pack Waterproof RV Hose Storage Bags', '', NULL, 'tools_maintenance', 33.99, 'AUD', 'https://m.media-amazon.com/images/I/7187YjFwBEL._AC_SL1500_.jpg', 'amazon', 'https://www.amazon.com/dp/B0CJGB8SLH', false, true, ARRAY[]::text[], 6, 'B0CJGB8SLH', NULL, NULL, NULL, NULL),

-- Product 8
('2x Spirit Level Bubble Leveler', '', NULL, 'parts_upgrades', 7.59, 'AUD', 'https://m.media-amazon.com/images/I/61VCAiEniRL._AC_SL1500_.jpg', 'amazon', 'https://www.amazon.com/dp/B09TDBLG71', false, true, ARRAY[]::text[], 7, 'B09TDBLG71', NULL, NULL, NULL, NULL),

-- Product 9
('Wireless smart security camera, two-year battery life', '', NULL, 'electronics', 132.00, 'AUD', 'https://m.media-amazon.com/images/I/41gjoN8DVHL._SL1000_.jpg', 'amazon', 'https://www.amazon.com/dp/B0D4828MSK', false, true, ARRAY[]::text[], 8, 'B0D4828MSK', NULL, NULL, NULL, NULL),

-- Product 10
('Solar Backup Camera Wireless with Strong Magnet attacment', '', NULL, 'electronics', 269.99, 'AUD', 'https://m.media-amazon.com/images/I/71tVfONLQKL._AC_SL1500_.jpg', 'amazon', 'https://www.amazon.com/dp/B0DWK6Y951', false, true, ARRAY[]::text[], 9, 'B0DWK6Y951', NULL, NULL, NULL, NULL),

-- Product 11
('4 Gang Wireless Switch Panel, Control Offroad Lights', '', NULL, 'parts_upgrades', 78.99, 'AUD', 'https://m.media-amazon.com/images/I/817HqdkM9PL._SL1500_.jpg', 'amazon', 'https://www.amazon.com/dp/B0F1F4XZ6B', false, true, ARRAY[]::text[], 10, 'B0F1F4XZ6B', NULL, NULL, NULL, NULL),

-- Product 12
('Wireless Carplay & Android Auto Car Stereo with Dash Cam, Portable 9" HD Touchscreen, 4K Front & Backup Camera, Loop Recording', '', NULL, 'parts_upgrades', 191.99, 'AUD', 'https://m.media-amazon.com/images/I/71JrNos6PrL._AC_SL1500_.jpg', 'amazon', 'https://www.amazon.com/dp/B0CPXLG2G3', false, true, ARRAY[]::text[], 11, 'B0CPXLG2G3', NULL, NULL, NULL, NULL),

-- Product 13
('7'' Portable Wireless Apple CarPlay & Android Auto Touch Screen', '', NULL, 'electronics', 84.99, 'AUD', 'https://m.media-amazon.com/images/I/71eS8bBBzVL._AC_SX679_.jpg', 'amazon', 'https://www.amazon.com/dp/B0DLNXGNHJ', false, true, ARRAY[]::text[], 12, 'B0DLNXGNHJ', NULL, NULL, NULL, NULL),

-- Product 14
('Portable Camping Chair', '', NULL, 'camping_expedition', 39.99, 'USD', 'https://m.media-amazon.com/images/I/61jyxBvNI9L._AC_SX679_.jpg', 'amazon', 'https://www.amazon.com/dp/B0DLNQQVSC', false, true, ARRAY[]::text[], 13, 'B0DLNQQVSC', NULL, NULL, NULL, NULL),

-- Product 15
('Ultralight Portable Camping Chair', '', NULL, 'camping_expedition', 43.84, 'AUD', 'https://m.media-amazon.com/images/I/71LDtQ6wVBL._AC_SX679_.jpg', 'amazon', 'https://www.amazon.com/dp/B07NT77GT8', false, true, ARRAY[]::text[], 14, 'B07NT77GT8', NULL, NULL, NULL, NULL),

-- Product 16
('Padded Folding Outdoor Camping Chair with Bag', '', NULL, 'camping_expedition', 59.90, 'AUD', 'https://m.media-amazon.com/images/I/915A43TgRqL._AC_SX679_.jpg', 'amazon', 'https://www.amazon.com/dp/B074YRN642', false, true, ARRAY[]::text[], 15, 'B074YRN642', NULL, NULL, NULL, NULL),

-- Product 17
('Magnetic Gas Level Indicator', '', NULL, 'camping_expedition', 16.47, 'AUD', 'https://m.media-amazon.com/images/I/81nw80S0lsL._AC_SL1500_.jpg', 'amazon', 'https://www.amazon.com/dp/B0DHLJV1B2', false, true, ARRAY[]::text[], 16, 'B0DHLJV1B2', NULL, NULL, NULL, NULL),

-- Product 18
('Propane Splitter with Gauge', '', NULL, 'camping_expedition', 35.69, 'AUD', 'https://m.media-amazon.com/images/I/71P9-MmoPLL._AC_SX679_.jpg', 'amazon', 'https://www.amazon.com/dp/B0D6G9J7FY', false, true, ARRAY[]::text[], 17, 'B0D6G9J7FY', NULL, NULL, NULL, NULL),

-- Product 19
('Camp Stove with Carrying Case', '', NULL, 'outdoor_gear', 87.99, 'AUD', 'https://m.media-amazon.com/images/I/71zJT8jt5vL._AC_SX679_.jpg', 'amazon', 'https://www.amazon.com/dp/B0FGH9WLZT', false, true, ARRAY[]::text[], 18, 'B0FGH9WLZT', NULL, NULL, NULL, NULL),

-- Product 20
('Ferro Rod Flint Fire Starter', '', NULL, 'camping_expedition', 17.79, 'AUD', 'https://m.media-amazon.com/images/I/51v1CobcqWL._AC_SX679_.jpg', 'amazon', 'https://www.amazon.com/dp/B0DFH4SWNV', false, true, ARRAY[]::text[], 19, 'B0DFH4SWNV', NULL, NULL, NULL, NULL),

-- Product 21
('Swivel Campfire Grill Heavy Duty Steel Grate', '', NULL, 'camping_expedition', 109.18, 'AUD', 'https://m.media-amazon.com/images/I/81IdSEpKVDL._AC_SX679_.jpg', 'amazon', 'https://www.amazon.com/dp/B08L3835L9', false, true, ARRAY[]::text[], 20, 'B08L3835L9', NULL, NULL, NULL, NULL),

-- Product 22
('Stainless Steel Bread Toaster', '', NULL, 'camping_expedition', 34.10, 'AUD', 'https://m.media-amazon.com/images/I/61RggSOf8KL._AC_SX679_.jpg', 'amazon', 'https://www.amazon.com/dp/B0CCQYGLKM', false, true, ARRAY[]::text[], 21, 'B0CCQYGLKM', NULL, NULL, NULL, NULL),

-- Product 23
('Camping Table with 4 Chairs', '', NULL, 'camping_expedition', 99.99, 'AUD', 'https://m.media-amazon.com/images/I/71CCdObKeSL._AC_SX679_.jpg', 'amazon', 'https://www.amazon.com/dp/B0F7G85ZQN', false, true, ARRAY[]::text[], 22, 'B0F7G85ZQN', NULL, NULL, NULL, NULL),

-- Product 24
('Charcoal Hibachi BBQ Portable Grill', '', NULL, 'outdoor_gear', 139.40, 'AUD', 'https://m.media-amazon.com/images/I/81qsQtjj12L._AC_SX679_.jpg', 'amazon', 'https://www.amazon.com/dp/B0C58CP1XD', false, true, ARRAY[]::text[], 23, 'B0C58CP1XD', NULL, NULL, NULL, NULL),

-- Product 25
('Kitchen Tripod', '', NULL, 'camping_expedition', 31.29, 'AUD', 'https://m.media-amazon.com/images/I/71-Uk6XK0GL._AC_SX679_.jpg', 'amazon', 'https://www.amazon.com/dp/B0FPBB83K8', false, true, ARRAY[]::text[], 24, 'B0FPBB83K8', NULL, NULL, NULL, NULL),

-- Product 26
('Folding Campfire Grill', '', NULL, 'outdoor_gear', 29.88, 'AUD', 'https://m.media-amazon.com/images/I/A1R02VySx-L._AC_SX679_.jpg', 'amazon', 'https://www.amazon.com/dp/B074N1W4G8', false, true, ARRAY[]::text[], 25, 'B074N1W4G8', NULL, NULL, NULL, NULL),

-- Product 27
('Camping Fire BBQ Plate + Skillet', '', NULL, 'camping_expedition', 39.90, 'AUD', 'https://m.media-amazon.com/images/I/71rGeluJ8xL._AC_SX679_.jpg', 'amazon', 'https://www.amazon.com/dp/B08HSXT78F', false, true, ARRAY[]::text[], 26, 'B08HSXT78F', NULL, NULL, NULL, NULL),

-- Product 28
('Fish Grilling Basket', '', NULL, 'camping_expedition', 28.99, 'USD', 'https://m.media-amazon.com/images/I/71z1cKiyTML._AC_SX679_.jpg', 'amazon', 'https://www.amazon.com/dp/B07T6RN1ZS', false, true, ARRAY[]::text[], 27, 'B07T6RN1ZS', NULL, NULL, NULL, NULL),

-- Product 29
('Foldable Collapsible BBQ Grill', '', NULL, 'camping_expedition', 71.80, 'USD', 'https://m.media-amazon.com/images/I/71SpVOzcfIL._AC_SX679_.jpg', 'amazon', 'https://www.amazon.com/dp/B08XM7Z6QP', false, true, ARRAY[]::text[], 28, 'B08XM7Z6QP', NULL, NULL, NULL, NULL),

-- Product 30
('Camp Oven', '', NULL, 'camping_expedition', 72.93, 'AUD', 'https://m.media-amazon.com/images/I/71MICEHE6sL._AC_SX679_.jpg', 'amazon', 'https://www.amazon.com/dp/B0009PURJA', false, true, ARRAY[]::text[], 29, 'B0009PURJA', NULL, NULL, NULL, NULL),

-- Product 31
('Camping Kitchen Table', '', NULL, 'camping_expedition', 109.99, 'AUD', 'https://m.media-amazon.com/images/I/71qcCnaYUqL._AC_SX679_.jpg', 'amazon', 'https://www.amazon.com/dp/B0C3QFWQST', false, true, ARRAY[]::text[], 30, 'B0C3QFWQST', NULL, NULL, NULL, NULL),

-- Product 32
('3/4-Inch Drive Needle Torque Wrench, 0 to 500 Newton/Meter', '', NULL, 'tools_maintenance', 77.36, 'AUD', 'https://m.media-amazon.com/images/I/61K+UsA+gqL._AC_SX679_.jpg', 'amazon', 'https://www.amazon.com/dp/B0C9TC6H1L', false, true, ARRAY[]::text[], 31, 'B0C9TC6H1L', NULL, NULL, NULL, NULL),

-- Product 33
('3/4" Drive Click Torque Wrench, 50-500 Nm', '', NULL, 'tools_maintenance', 103.99, 'AUD', 'https://m.media-amazon.com/images/I/81Wp5Gl06YL._AC_SX679_.jpg', 'amazon', 'https://www.amazon.com/dp/B0DR2QKGH1', false, true, ARRAY[]::text[], 32, 'B0DR2QKGH1', NULL, NULL, NULL, NULL),

-- Product 34
('Torque Multiplier Wrench Set', '', NULL, 'tools_maintenance', 74.68, 'AUD', 'https://m.media-amazon.com/images/I/71TjnsbCA1L._AC_SX679_.jpg', 'amazon', 'https://www.amazon.com/dp/B0CP3JJSQT', false, true, ARRAY[]::text[], 33, 'B0CP3JJSQT', NULL, NULL, NULL, NULL),

-- Product 35
('Premium GPS Tracking System', '', NULL, 'parts_upgrades', 129.00, 'AUD', 'https://m.media-amazon.com/images/I/61U+CATwqAL._AC_SL1500_.jpg', 'amazon', 'https://www.amazon.com/dp/B0DGGRCT94', false, true, ARRAY[]::text[], 34, 'B0DGGRCT94', NULL, NULL, NULL, NULL),

-- Product 36
('Rechargeable Mosquito Repeller', '', NULL, 'camping_expedition', 50.50, 'AUD', 'https://m.media-amazon.com/images/I/610+0TjG2mL._AC_SX679_.jpg', 'amazon', 'https://www.amazon.com/dp/B0BJJ7YDZ9', false, true, ARRAY[]::text[], 35, 'B0BJJ7YDZ9', NULL, NULL, NULL, NULL),

-- Product 37
('Rechargeable Fly Zapper', '', NULL, 'outdoor_gear', 42.49, 'USD', 'https://m.media-amazon.com/images/I/712wkdu7HlL._AC_SX679_.jpg', 'amazon', 'https://www.amazon.com/dp/B0FGJFPZVV', false, true, ARRAY[]::text[], 36, 'B0FGJFPZVV', NULL, NULL, NULL, NULL),

-- Product 38
('Fly Away 2 Pack', '', NULL, 'camping_expedition', 46.99, 'USD', 'https://m.media-amazon.com/images/I/71-YbdfKZPL._AC_SX679_.jpg', 'amazon', 'https://www.amazon.com/dp/B09FKVLGTZ', false, true, ARRAY[]::text[], 37, 'B09FKVLGTZ', NULL, NULL, NULL, NULL),

-- Product 39
('2 Pcs Mosquito Head Net Hat', '', NULL, 'outdoor_gear', 20.99, 'USD', 'https://m.media-amazon.com/images/I/71QmEBXOxBL._AC_SX679_.jpg', 'amazon', 'https://www.amazon.com/dp/B0D6KL86WY', false, true, ARRAY[]::text[], 38, 'B0D6KL86WY', NULL, NULL, NULL, NULL),

-- Product 40
('4 Pack Mosquito Head Net', '', NULL, 'outdoor_gear', 19.99, 'USD', 'https://m.media-amazon.com/images/I/71owIxGJgYS._AC_SX679_.jpg', 'amazon', 'https://www.amazon.com/dp/B096X8JGPR', false, true, ARRAY[]::text[], 39, 'B096X8JGPR', NULL, NULL, NULL, NULL),

-- Product 41
('Mosquito Head Net 2 Pack', '', NULL, 'outdoor_gear', 12.99, 'USD', 'https://m.media-amazon.com/images/I/71wxXdaHJRL._AC_SX679_.jpg', 'amazon', 'https://www.amazon.com/dp/B0D2CXSBB5', false, true, ARRAY[]::text[], 40, 'B0D2CXSBB5', NULL, NULL, NULL, NULL),

-- Product 42
('Portable Toilet', '', NULL, 'camping_expedition', 32.39, 'USD', 'https://m.media-amazon.com/images/I/61s8AA8YVaL._AC_SX679_.jpg', 'amazon', 'https://www.amazon.com/dp/B0FQQZ5LVW', false, true, ARRAY[]::text[], 41, 'B0FQQZ5LVW', NULL, NULL, NULL, NULL),

-- Product 43
('Camping Gear Bag | 42L', '', NULL, 'camping_expedition', 29.07, 'USD', 'https://m.media-amazon.com/images/I/710vMlXk5EL._AC_SX679_.jpg', 'amazon', 'https://www.amazon.com/dp/B0FSYFJ86H', false, true, ARRAY[]::text[], 42, 'B0FSYFJ86H', NULL, NULL, NULL, NULL),

-- Product 44
('Telescopic Camping Lights Rechargeable', '', NULL, 'camping_expedition', 129.37, 'USD', 'https://m.media-amazon.com/images/I/61vJMgAfLRL._AC_SX679_.jpg', 'amazon', 'https://www.amazon.com/dp/B0DY73Q588', false, true, ARRAY[]::text[], 43, 'B0DY73Q588', NULL, NULL, NULL, NULL),

-- Product 45
('Classic Solar-Powered Rechargeable Camping Lantern', '', NULL, 'camping_expedition', 35.99, 'USD', 'https://m.media-amazon.com/images/I/71Znya4sbvL._AC_SX679_.jpg', 'amazon', 'https://www.amazon.com/dp/B0D5B17ZBW', false, true, ARRAY[]::text[], 44, 'B0D5B17ZBW', NULL, NULL, NULL, NULL),

-- Product 46
('Camping String Lights', '', NULL, 'camping_expedition', 18.69, 'USD', 'https://m.media-amazon.com/images/I/81mKCoLEfNL._AC_SX679_.jpg', 'amazon', 'https://www.amazon.com/dp/B0DY4PFB7X', false, true, ARRAY[]::text[], 45, 'B0DY4PFB7X', NULL, NULL, NULL, NULL),

-- Product 47
('LED Headlamp Rechargeable', '', NULL, 'outdoor_gear', 44.99, 'USD', 'https://m.media-amazon.com/images/I/71QDZY31gbL._AC_SX679_.jpg', 'amazon', 'https://www.amazon.com/dp/B09MS489TF', false, true, ARRAY[]::text[], 46, 'B09MS489TF', NULL, NULL, NULL, NULL),

-- Product 48
('Camping Fan', '', NULL, 'outdoor_gear', 39.99, 'AUD', 'https://m.media-amazon.com/images/I/717Ornlad1L._AC_SX679_.jpg', 'amazon', 'https://www.amazon.com/dp/B0CSVCWQ3C', false, true, ARRAY[]::text[], 47, 'B0CSVCWQ3C', NULL, NULL, NULL, NULL),

-- Product 49
('Camping Lights 3-Pack', '', NULL, 'camping_expedition', 16.99, 'AUD', 'https://m.media-amazon.com/images/I/61IMSR382qL._AC_SX679_.jpg', 'amazon', 'https://www.amazon.com/dp/B07B26MHPG', false, true, ARRAY[]::text[], 48, 'B07B26MHPG', NULL, NULL, NULL, NULL),

-- Product 50
('Portable Shower', '', NULL, 'outdoor_gear', 62.48, 'AUD', 'https://m.media-amazon.com/images/I/81W+S3UHv7L._AC_SX679_.jpg', 'amazon', 'https://www.amazon.com/dp/B0F1MX1L5H', false, true, ARRAY[]::text[], 49, 'B0F1MX1L5H', NULL, NULL, NULL, NULL),

-- Product 51
('Emergency Rain Poncho', '', NULL, 'outdoor_gear', 33.92, 'AUD', 'https://m.media-amazon.com/images/I/91liC0GPyZL._AC_SX679_.jpg', 'amazon', 'https://www.amazon.com/dp/B0863KMVJH', false, true, ARRAY[]::text[], 50, 'B0863KMVJH', NULL, NULL, NULL, NULL),

-- Product 52
('10m Camping String Lights Waterproof', '', NULL, 'camping_expedition', 19.76, 'AUD', 'https://m.media-amazon.com/images/I/81BxXiY4zhL._AC_SX679_.jpg', 'amazon', 'https://www.amazon.com/dp/B0DLB7DWBC', false, true, ARRAY[]::text[], 51, 'B0DLB7DWBC', NULL, NULL, NULL, NULL),

-- Product 53
('6 Pack LED Road Flares Emergency Lights Roadside Safety', 'Pack of 6 LED Road Flares Emergency Light with Storage Bag great for dividing up among family members; A Perfect Emergency Kit to keep in the trunk of their vehicles for Roadside emergencies and distress situations. (We recommend AAA batteries to these LED flares light | BATTERIES NOT INCLUDED).', NULL, 'recovery_gear', 40.26, 'AUD', 'https://m.media-amazon.com/images/I/71HruZrz8nL._AC_SX679_.jpg', 'amazon', 'https://www.amazon.com/dp/B07K3YFMVH', false, true, ARRAY[]::text[], 52, 'B07K3YFMVH', NULL, NULL, NULL, NULL),

-- Product 54
('Warning Triangle Kit Foldable and Reflective Safety Vest', 'Emergency kit includes two warning triangles and two reflective vests.', NULL, 'recovery_gear', 34.99, 'AUD', 'https://m.media-amazon.com/images/I/712+fWORj7L._AC_SX679_.jpg', 'amazon', 'https://www.amazon.com/dp/B08DTT8LHX', false, true, ARRAY[]::text[], 53, 'B08DTT8LHX', NULL, NULL, NULL, NULL),

-- Product 55
('Auxbeam Strobe Offroad Lights', 'High-performance LED strobe lights for off-road vehicles. Enhanced visibility and safety for night driving.', NULL, 'electronics', 89.99, 'AUD', 'https://m.media-amazon.com/images/I/81S4FfgNQiL._AC_SX679_.jpg', 'amazon', 'https://www.amazon.com/dp/B09YLVV9H8?tag=unimogcommuni-22', false, true, ARRAY['lights','LED','off-road','safety'], 54, 'B09YLVV9H8', '{"AU":"B0C7BSPZ31","US":"B09YLVV9H8"}'::jsonb, '{"AU":{"amount":251.3,"currency":"AUD"},"US":{"amount":89.99,"currency":"USD","formatted":"USD 89.99"}}'::jsonb, '{"AU":"https://www.amazon.com.au/dp/B0C7BSPZ31?tag=unimogcommuni-22","US":"https://www.amazon.com/dp/B09YLVV9H8?tag=unimogcommuni-22"}'::jsonb, 4.50),

-- Product 56
('SURVIVAL Vehicle First Aid KIT', 'I use this in my truck', NULL, 'outdoor_gear', 99.00, 'AUD', 'https://m.media-amazon.com/images/I/811kp8PrGoL._AC_SX679_.jpg', 'amazon', 'https://www.amazon.com/dp/B09VKVRGJ7', false, true, ARRAY[]::text[], 55, 'B09VKVRGJ7', NULL, NULL, NULL, NULL),

-- Product 57
('25.4 mm x 6.1 m Kinetic Recovery Tow Rope 17237 kg', 'Heavy-Duty Vehicle Tow Strap: With an impressive 38,000 lbs breaking strength, our tow strap is perfect for towing trucks, off-road vehicles, and heavy equipment. At 20 feet long and 1 inch wide, it''s your go-to for tackling any rugged terrain or emergency situation.', NULL, 'recovery_gear', 82.99, 'AUD', 'https://m.media-amazon.com/images/I/71iO9rVQbDL._AC_SX679_.jpg', 'amazon', 'https://www.amazon.com/dp/B0D4YYCKTV', false, true, ARRAY[]::text[], 56, 'B0D4YYCKTV', NULL, NULL, NULL, NULL),

-- Product 58
('Snatch Block Ring - Heavy Duty Pulley for Winch & Recovery Gear', 'Dual Functionality - This Snatch Block Ring provides the power of two standard snatch blocks, giving you added versatility in your recovery kit. It can be used to double your winch line, allowing you to adapt to a range of recovery configurations, from simple pulls to more complex setups.', NULL, 'recovery_gear', 292.79, 'AUD', 'https://m.media-amazon.com/images/I/61CYyUsgvyL._AC_SX679_.jpg', 'amazon', 'https://www.amazon.com/dp/B0D586M28S', false, true, ARRAY[]::text[], 57, 'B0D586M28S', NULL, NULL, NULL, NULL),

-- Product 59
('Recovery Ring Snatch Block - 46,000lbs/23 tons', 'Recovery Ring Snatch Block - 46,000lbs Break Strength, Soft Shackle Pulley for Winch Rope, Anodized Aluminum Off-Road Recovery', NULL, 'recovery_gear', 27.19, 'AUD', 'https://m.media-amazon.com/images/I/616RDSXal3L._AC_SX679_.jpg', 'amazon', 'https://www.amazon.com/dp/B09Z1VZ9GJ', false, true, ARRAY[]::text[], 58, 'B09Z1VZ9GJ', NULL, NULL, NULL, NULL),

-- Product 60
('Aluminum Alloy LED Chassis Lights for Trucks', 'Truck rock lights:the installation process for this car exterior enhancement is simple and effortless, allowing for easy installation of the aluminum alloy under car LED light,Lighting for ATV', NULL, 'parts_upgrades', 12.69, 'AUD', 'https://m.media-amazon.com/images/I/61gV5+VvI8L._AC_SX679_.jpg', 'amazon', 'https://www.amazon.com/dp/B0G331MRWG', false, true, ARRAY[]::text[], 59, 'B0G331MRWG', NULL, NULL, NULL, NULL),

-- Product 61
('Towing Strap Trailer Pull Rope 38000lbs/17000kg/17T', 'Comes with protective sleeve to prevent overheating and slippage.
Stronger than steel - 17 tons breaking strength!
It floats - no more losing shackles in the water or mire!
It''s handy to store and prepare for emergency.', NULL, 'recovery_gear', 139.46, 'AUD', 'https://m.media-amazon.com/images/I/61a6a9oy9DL._AC_SX679_.jpg', 'amazon', 'https://www.amazon.com/dp/B0DPK4KM31', false, true, ARRAY[]::text[], 60, 'B0DPK4KM31', NULL, NULL, NULL, NULL),

-- Product 62
('Winch Cable Damper', 'Winch Cable Damper Cushion Pad with Reflective Strips, Off-Road Winch Rope Protector for Truck Towing and Recovery Safety, High-Visibility Buffer Accessory for 4x4 Vehicles', NULL, 'recovery_gear', 36.89, 'AUD', 'https://m.media-amazon.com/images/I/61eDEcbaQwL._AC_SX679_.jpg', 'amazon', 'https://www.amazon.com/dp/B0FVYYHGCX', false, true, ARRAY[]::text[], 61, 'B0FVYYHGCX', NULL, NULL, NULL, NULL),

-- Product 63
('Synthetic Winch Rope Cable Kit: 1/2" x 100 ft 32000lbs/14.5 tons', 'WINCH ROPE KIT: Including synthetic winch rope with a sleeve and a hook. An ideal choice for most winches of SUV, Truck, ​ATV, UTV,', 'SPARKWHIZ Synthetic Winch Rope Cable Kit: 1/2" x 100 ft 32000lbs Winch Line Cable with Protective Sleeve + Winch Hook for 4WD Off Road Vehicle Truck SUV', 'recovery_gear', 208.74, 'AUD', 'https://m.media-amazon.com/images/I/814XeZ5LkzL._AC_SX466_.jpg', 'amazon', 'https://www.amazon.com/dp/B0C3HBBR4V', false, true, ARRAY[]::text[], 62, 'B0C3HBBR4V', '{"AU":"B0C3HBBR4V","US":"B0C3HBBR4V"}'::jsonb, '{"AU":{"amount":208.74,"currency":"AUD"},"US":{"amount":147.03,"currency":"USD","formatted":"USD 147.03"}}'::jsonb, '{"AU":"https://www.amazon.com.au/dp/B0C3HBBR4V?tag=unimogcommuni-22","US":"https://www.amazon.com/dp/B0C3HBBR4V?tag=unimogcommuni-22"}'::jsonb, 4.50),

-- Product 64
('RHINO USA Recovery Strap 20ft, 14 tons', 'Lab Tested 31,518lb / 14 tons Break Strength - Heavy Duty Offroad Straps with Triple Reinforced Loop Ends to Ensure Peace of Mind', NULL, 'recovery_gear', 116.62, 'AUD', 'https://m.media-amazon.com/images/I/81D51I3f8hL._AC_SX679_.jpg', 'amazon', 'https://www.amazon.com/dp/B01M1SMPOS', false, true, ARRAY['strap','recovery','20ft','heavy-duty'], 63, 'B01M1SMPOS', '{"AU":"B06WRSR2PG","US":"B01M1SMPOS"}'::jsonb, '{"AU":{"amount":116.62,"currency":"AUD"},"US":{"amount":39.99,"currency":"USD","formatted":"USD 39.99"}}'::jsonb, '{"AU":"https://www.amazon.com.au/dp/B06WRSR2PG?tag=unimogcommuni-22","US":"https://www.amazon.com/dp/B01M1SMPOS?tag=unimogcommuni-22"}'::jsonb, 4.50),

-- Product 65
('Kinetic Recovery Rope 1.1" - 48000lbs', 'Professional-grade 1.1-inch kinetic recovery rope rated for 48,000 lbs. Essential for stuck vehicle recovery.', NULL, 'recovery_gear', 119.99, 'AUD', 'https://m.media-amazon.com/images/I/81GkLN+NrQL._AC_SX679_.jpg', 'amazon', 'https://www.amazon.com/dp/B0C3BK3BHF?tag=unimogcommuni-22', false, true, ARRAY['rope','kinetic','recovery','48000lbs'], 64, 'B0C3BK3BHF', '{"AU":"B0BZV6C8DF","US":"B0C3BK3BHF"}'::jsonb, '{"AU":{"amount":89.24,"currency":"AUD"},"US":{"amount":119.99,"currency":"USD","formatted":"USD 119.99"}}'::jsonb, '{"AU":"https://www.amazon.com.au/dp/B0BZV6C8DF?tag=unimogcommuni-22","US":"https://www.amazon.com/dp/B0C3BK3BHF?tag=unimogcommuni-22"}'::jsonb, 4.50),

-- Product 66
('Yankum Kinetic Recovery Shackle', 'Heavy-duty kinetic recovery shackle with nylon construction. Safer alternative to metal shackles.', NULL, 'recovery_gear', 129.99, 'AUD', 'https://m.media-amazon.com/images/I/411oPskZiSL._AC_.jpg', 'amazon', 'https://www.amazon.com/dp/B0FPRBZYGS?tag=unimogcommuni-22', false, true, ARRAY['shackle','recovery','kinetic','nylon'], 65, 'B0FPRBZYGS', '{"AU":"B0FPRLLKVW","US":"B0FPRBZYGS"}'::jsonb, '{"AU":{"amount":181.52,"currency":"AUD"},"US":{"amount":129.99,"currency":"USD","formatted":"USD 129.99"}}'::jsonb, '{"AU":"https://www.amazon.com.au/dp/B0FPRLLKVW?tag=unimogcommuni-22","US":"https://www.amazon.com/dp/B0FPRBZYGS?tag=unimogcommuni-22"}'::jsonb, 4.50),

-- Product 67
('ALL-TOP Recovery Snatch Block 12000lb', '12,000 lb capacity snatch block for winch operations. Doubles pulling power and changes pull direction.', NULL, 'recovery_gear', 69.99, 'AUD', 'https://m.media-amazon.com/images/I/61PsMFi-YcL._AC_SX679_.jpg', 'amazon', 'https://www.amazon.com/dp/B0BF5M5BJB?tag=unimogcommuni-22', false, true, ARRAY['snatch-block','winch','recovery','12000lb'], 66, 'B0BF5M5BJB', '{"AU":"B0F1D7ZTCZ","US":"B0BF5M5BJB"}'::jsonb, '{"AU":{"amount":102.87,"currency":"AUD"},"US":{"amount":69.99,"currency":"USD","formatted":"USD 69.99"}}'::jsonb, '{"AU":"https://www.amazon.com.au/dp/B0F1D7ZTCZ?tag=unimogcommuni-22","US":"https://www.amazon.com/dp/B0BF5M5BJB?tag=unimogcommuni-22"}'::jsonb, 4.50),

-- Product 68
('Traction Boards Recovery Tracks Tire Ladder', 'The unique u-shaped surface strengthening design increases the stability of the product, and the pointed design effectively prevents the sideslip when the vehicle is stuck', NULL, 'recovery_gear', 85.78, 'AUD', 'https://m.media-amazon.com/images/I/71IWFSYT4SL._AC_SY300_SX300_QL70_ML2_.jpg', 'amazon', 'https://www.amazon.com/dp/B08XWJ7YPY', false, true, ARRAY[]::text[], 67, 'B08XWJ7YPY', NULL, NULL, NULL, NULL),

-- Product 69
('Car Seat Organizer', 'Large Capacity Organizer with Cup Holder, Collapsible Automotive Storage Box with 11 Compartments Organizers', NULL, 'parts_upgrades', 39.94, 'AUD', 'https://m.media-amazon.com/images/I/81vNgT1LsAL._AC_SX679_.jpg', 'amazon', 'https://www.amazon.com/dp/B0DJTGK2BQ', false, true, ARRAY[]::text[], 68, 'B0DJTGK2BQ', NULL, NULL, NULL, NULL),

-- Product 70
('Off-Road Essential Guide', 'Comprehensive off-road driving guide book in English. Essential reading for Unimog and 4x4 enthusiasts.', NULL, 'books_manuals', 24.99, 'AUD', 'https://m.media-amazon.com/images/I/41PMZC8XH1L._AC_.jpg', 'amazon', 'https://www.amazon.com/dp/B000BK6G84?tag=unimogcommuni-22', false, true, ARRAY['book','guide','off-road','manual'], 69, 'B000BK6G84', '{"AU":"B000BK6G84","US":"B000BK6G84"}'::jsonb, '{"AU":{"amount":41.05,"currency":"AUD"},"US":{"amount":24.99,"currency":"USD","formatted":"USD 24.99"}}'::jsonb, '{"AU":"https://www.amazon.com.au/dp/B000BK6G84?tag=unimogcommuni-22","US":"https://www.amazon.com/dp/B000BK6G84?tag=unimogcommuni-22"}'::jsonb, 4.50),

-- Product 71
('Starlink Mini Fully Enclosed Rugged Flat & Magnet Mount', '', NULL, 'parts_upgrades', 120.00, 'AUD', 'https://m.media-amazon.com/images/I/71d1EYLC5lL._AC_SL1500_.jpg', 'amazon', 'https://www.amazon.com/dp/B0FLDNTY7N', false, true, ARRAY[]::text[], 70, 'B0FLDNTY7N', NULL, NULL, NULL, NULL),

-- Product 72
('Starlink Mini Magnetic roof Mount', '', NULL, 'parts_upgrades', 61.57, 'AUD', 'https://m.media-amazon.com/images/I/61fWu0Bzz9L._AC_SL1500_.jpg', 'amazon', 'https://www.amazon.com/dp/B0FMRPTNJ1', false, true, ARRAY[]::text[], 71, 'B0FMRPTNJ1', NULL, NULL, NULL, NULL),

-- Product 73
('Universal Quick Release Mount', 'All-terrain quick-release mounting system. Compatible with Cybertruck-style adventures and off-road builds.', NULL, 'parts_upgrades', 159.99, 'AUD', 'https://m.media-amazon.com/images/I/51lVAyyVstL._AC_SX679_.jpg', 'amazon', 'https://www.amazon.com/dp/B0FB8X7ZSB?tag=unimogcommuni-22', false, true, ARRAY['mount','quick-release','universal','accessories'], 72, 'B0FB8X7ZSB', '{"AU":"B0FB8X7ZSB","US":"B0FB8X7ZSB"}'::jsonb, '{"AU":{"amount":132.37,"currency":"AUD"},"US":{"amount":159.99,"currency":"USD","formatted":"USD 159.99"}}'::jsonb, '{"AU":"https://www.amazon.com.au/dp/B0FB8X7ZSB?tag=unimogcommuni-22","US":"https://www.amazon.com/dp/B0FB8X7ZSB?tag=unimogcommuni-22"}'::jsonb, 4.50),

-- Product 74
('Trasharoo Spare Tire Trash Bag TAN', 'Waterproof trash bag that mounts to spare tire. Keep your vehicle organized on long expeditions.', 'Premium spare tire trash bag for overlanding and off-road adventures', 'camping_expedition', 29.99, 'AUD', 'https://m.media-amazon.com/images/I/71p7Kdk9tfL._AC_SX679_.jpg', 'amazon', 'https://www.amazon.com/dp/B09C2TWQV2?tag=unimogcommuni-22', false, true, ARRAY['storage','trash','organization','spare-tire'], 73, 'B09C2TWQV2', '{"AU":"B004RGSGKO","US":"B09C2TWQV2"}'::jsonb, '{"AU":{"amount":112.47,"currency":"AUD"},"US":{"amount":29.99,"currency":"USD","formatted":"USD 29.99"}}'::jsonb, '{"AU":"https://www.amazon.com.au/dp/B004RGSGKO?tag=unimogcommuni-22","US":"https://www.amazon.com/dp/B09C2TWQV2?tag=unimogcommuni-22"}'::jsonb, 4.50),

-- Product 75
('ECCO Offroad Waterproof Hiking Boots', 'Waterproof hiking boots designed for off-road terrain. Durable construction for expedition use.', NULL, 'apparel_merchandise', 179.95, 'AUD', 'https://m.media-amazon.com/images/I/61Y9DZFM+qL._AC_SY695_.jpg', 'amazon', 'https://www.amazon.com/dp/B0CQN2F9RJ?tag=unimogcommuni-22', false, true, ARRAY['boots','hiking','waterproof','footwear'], 74, 'B0CQN2F9RJ', '{"AU":"B0CQN2F9RJ","US":"B0CQN2F9RJ"}'::jsonb, '{"AU":{"amount":229.78,"currency":"AUD"},"US":{"amount":179.95,"currency":"USD","formatted":"USD 179.95"}}'::jsonb, '{"AU":"https://www.amazon.com.au/dp/B0CQN2F9RJ?tag=unimogcommuni-22","US":"https://www.amazon.com/dp/B0CQN2F9RJ?tag=unimogcommuni-22"}'::jsonb, 4.50),

-- Product 76
('Timberland Men''s Stormbucks Chelsea Boots', 'Inject a little dramatic style into your wardrobe with a nubuck menʼs chukka thatʼs monochrome from top to bottom. Adventure 2.0 cupsole high-tops counteract the concrete of the urban jungle.', NULL, 'apparel_merchandise', 175.91, 'AUD', 'https://m.media-amazon.com/images/I/715xOGccoJL._AC_SY695_.jpg', 'amazon', 'https://www.amazon.com/dp/B007UX5XZ2', false, true, ARRAY[]::text[], 75, 'B007UX5XZ2', NULL, NULL, NULL, NULL),

-- Product 77
('2 Pcs Rv Refrigerator Bars', '', NULL, 'parts_upgrades', 23.61, 'AUD', 'https://m.media-amazon.com/images/I/71pJ7DZ+N5L._AC_SL1500_.jpg', 'amazon', 'https://www.amazon.com/dp/B0D1C3XB5R', false, true, ARRAY[]::text[], 76, 'B0D1C3XB5R', NULL, NULL, NULL, NULL),

-- Product 78
('Collapsible Wash Basins x 3', '', NULL, 'camping_expedition', 25.37, 'AUD', 'https://m.media-amazon.com/images/I/61kkKcOJLhL._AC_SL1500_.jpg', 'amazon', 'https://www.amazon.com/dp/B0CW39733H', false, true, ARRAY[]::text[], 77, 'B0CW39733H', NULL, NULL, NULL, NULL),

-- Product 79
('Pack of 5 Towel Rails', '', NULL, 'camping_expedition', 18.59, 'AUD', 'https://m.media-amazon.com/images/I/61-btwyolrL._AC_SL1500_.jpg', 'amazon', 'https://www.amazon.com/dp/B0D9CS6MDG', false, true, ARRAY[]::text[], 78, 'B0D9CS6MDG', NULL, NULL, NULL, NULL),

-- Product 80
('2 Pcs Camping Washing Line - 8M', '', NULL, 'camping_expedition', 19.99, 'AUD', 'https://m.media-amazon.com/images/I/61mbAptk-rL._AC_SL1500_.jpg', 'amazon', 'https://www.amazon.com/dp/B0FMS2VLW9', false, true, ARRAY[]::text[], 79, 'B0FMS2VLW9', NULL, NULL, NULL, NULL),

-- Product 81
('RV Refrigerator Door Latch', '', NULL, 'parts_upgrades', 16.91, 'AUD', 'https://m.media-amazon.com/images/I/61jG61yRljL._AC_SL1500_.jpg', 'amazon', 'https://www.amazon.com/dp/B0CCZ6HL18', false, true, ARRAY[]::text[], 80, 'B0CCZ6HL18', NULL, NULL, NULL, NULL);

-- Verification
SELECT 'Data export complete!' as status;
SELECT COUNT(*) as products_imported FROM affiliate_products;

COMMIT;
