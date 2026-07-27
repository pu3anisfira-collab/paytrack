SELECT "fieldName", "fieldKey", "fieldType", "isRequired", "displayOrder"
FROM category_fields
WHERE "categoryId" = 'seed-mileage-claim'
ORDER BY "displayOrder";
