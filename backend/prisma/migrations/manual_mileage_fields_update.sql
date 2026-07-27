-- Update Mileage Claim category fields to match the new route builder form
-- Category seed ID is 'seed-mileage-claim'

-- 1. Add vehicle_type field (if not already present)
INSERT INTO category_fields ("id", "categoryId", "fieldName", "fieldKey", "fieldType", "isRequired", "displayOrder", "placeholder")
SELECT
  gen_random_uuid(),
  c.id,
  'Vehicle Type',
  'vehicle_type',
  'text',
  false,
  1,
  null
FROM categories c
WHERE c.id = 'seed-mileage-claim'
  AND NOT EXISTS (
    SELECT 1 FROM category_fields cf
    WHERE cf."categoryId" = c.id AND cf."fieldKey" = 'vehicle_type'
  );

-- 2. Add mileage_segments field (JSON store from route builder — replaces old 'route' field)
INSERT INTO category_fields ("id", "categoryId", "fieldName", "fieldKey", "fieldType", "isRequired", "displayOrder", "placeholder")
SELECT
  gen_random_uuid(),
  c.id,
  'Route Segments',
  'mileage_segments',
  'textarea',
  false,
  5,
  null
FROM categories c
WHERE c.id = 'seed-mileage-claim'
  AND NOT EXISTS (
    SELECT 1 FROM category_fields cf
    WHERE cf."categoryId" = c.id AND cf."fieldKey" = 'mileage_segments'
  );

-- 3. Remove the old plain-text 'route' field (replaced by mileage_segments)
DELETE FROM category_fields
WHERE "categoryId" = 'seed-mileage-claim'
  AND "fieldKey" = 'route';

-- 4. Fix displayOrder so fields are in the right sequence
UPDATE category_fields SET "displayOrder" = 0 WHERE "categoryId" = 'seed-mileage-claim' AND "fieldKey" = 'staff_name';
UPDATE category_fields SET "displayOrder" = 1 WHERE "categoryId" = 'seed-mileage-claim' AND "fieldKey" = 'vehicle_type';
UPDATE category_fields SET "displayOrder" = 2 WHERE "categoryId" = 'seed-mileage-claim' AND "fieldKey" = 'car_brand';
UPDATE category_fields SET "displayOrder" = 3 WHERE "categoryId" = 'seed-mileage-claim' AND "fieldKey" = 'license_plate';
UPDATE category_fields SET "displayOrder" = 4 WHERE "categoryId" = 'seed-mileage-claim' AND "fieldKey" = 'objectives';
UPDATE category_fields SET "displayOrder" = 5 WHERE "categoryId" = 'seed-mileage-claim' AND "fieldKey" = 'mileage_segments';
UPDATE category_fields SET "displayOrder" = 6 WHERE "categoryId" = 'seed-mileage-claim' AND "fieldKey" = 'total_distance_km';
