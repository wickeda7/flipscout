-- FlipScout Phase 3 demo seed.
-- Safe to rerun because fixed UUIDs are used with ON CONFLICT.

INSERT INTO stores (
  id, retailer, retailer_store_id, store_name, city, state, latitude, longitude
) VALUES
('10000000-0000-0000-0000-000000000001','Home Depot','0279','Home Depot Lake Mary #0279','Lake Mary','FL',28.7855,-81.3572),
('10000000-0000-0000-0000-000000000002','Lowe''s','1641','Lowe''s Sanford #1641','Sanford','FL',28.8037,-81.2738),
('10000000-0000-0000-0000-000000000003','Walmart','857','Walmart Sanford Supercenter #857','Sanford','FL',28.7978,-81.2926),
('10000000-0000-0000-0000-000000000004','Target',NULL,'Target Lake Mary','Lake Mary','FL',28.7581,-81.3377),
('10000000-0000-0000-0000-000000000005','Lowe''s','0604','Lowe''s Altamonte Springs #0604','Altamonte Springs','FL',28.6694,-81.3890),
('10000000-0000-0000-0000-000000000006','Walmart','943','Walmart Casselberry Supercenter #943','Casselberry','FL',28.6647,-81.3215)
ON CONFLICT (id) DO UPDATE SET
  retailer = EXCLUDED.retailer,
  retailer_store_id = EXCLUDED.retailer_store_id,
  store_name = EXCLUDED.store_name,
  city = EXCLUDED.city,
  state = EXCLUDED.state,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  updated_at = NOW();

INSERT INTO deals (
  id, external_id, store_id, product_name, brand, category,
  retail_price, clearance_price, resale_price, marketplace_fee_percent,
  shipping_cost, other_costs, inventory, estimated_profit, roi, margin,
  break_even_price, buy_score, status, source_updated_at
) VALUES
('20000000-0000-0000-0000-000000000001','demo-1','10000000-0000-0000-0000-000000000001','DEWALT 20V MAX XR Brushless Impact Driver Kit','DEWALT','Tools',179,49,119,13.25,10,0,6,44.23,90.27,37.17,67.43,92,'strong-buy',NOW()-INTERVAL '8 minutes'),
('20000000-0000-0000-0000-000000000002','demo-2','10000000-0000-0000-0000-000000000002','Milwaukee M18 REDLITHIUM XC 5.0Ah Battery','Milwaukee','Tools',149,39,94,13.25,8,0,4,34.55,88.59,36.76,54.18,90,'strong-buy',NOW()-INTERVAL '12 minutes'),
('20000000-0000-0000-0000-000000000003','demo-3','10000000-0000-0000-0000-000000000003','LG 27" QHD Gaming Monitor 165Hz','LG','Electronics',249,119,199,13.25,25,0,3,28.63,24.06,14.39,165.99,64,'buy',NOW()-INTERVAL '21 minutes'),
('20000000-0000-0000-0000-000000000004','demo-4','10000000-0000-0000-0000-000000000004','Shark Cordless Stick Vacuum','Shark','Home',299,104.99,184,13.25,22,0,2,32.63,31.08,17.73,146.98,70,'buy',NOW()-INTERVAL '34 minutes'),
('20000000-0000-0000-0000-000000000005','demo-5','10000000-0000-0000-0000-000000000005','Bosch 12V MAX 2-Tool Combo Kit','Bosch','Tools',159,35,98,13.25,8,0,8,42.02,120.06,42.88,49.57,96,'strong-buy',NOW()-INTERVAL '5 minutes'),
('20000000-0000-0000-0000-000000000006','demo-6','10000000-0000-0000-0000-000000000006','Cosori Smart Wi-Fi Air Fryer Pro','Cosori','Kitchen',129,49,79,13.25,13,0,7,6.53,13.33,8.27,71.47,48,'maybe',NOW()-INTERVAL '19 minutes')
ON CONFLICT (id) DO UPDATE SET
  store_id = EXCLUDED.store_id,
  product_name = EXCLUDED.product_name,
  brand = EXCLUDED.brand,
  category = EXCLUDED.category,
  retail_price = EXCLUDED.retail_price,
  clearance_price = EXCLUDED.clearance_price,
  resale_price = EXCLUDED.resale_price,
  marketplace_fee_percent = EXCLUDED.marketplace_fee_percent,
  shipping_cost = EXCLUDED.shipping_cost,
  other_costs = EXCLUDED.other_costs,
  inventory = EXCLUDED.inventory,
  estimated_profit = EXCLUDED.estimated_profit,
  roi = EXCLUDED.roi,
  margin = EXCLUDED.margin,
  break_even_price = EXCLUDED.break_even_price,
  buy_score = EXCLUDED.buy_score,
  status = EXCLUDED.status,
  source_updated_at = EXCLUDED.source_updated_at,
  updated_at = NOW();
