SELECT "Product".*, "FilterFields"."id" AS "FilterFields.id", "FilterFields"."field_name" AS "FilterFields.field_name", "FilterFields"."field_type" AS "FilterFields.field_type", "FilterFields"."allowed_values" AS "FilterFields.allowed_values" FROM (SELECT "Product"."id", "Product"."product_code", "Product"."product_name", "Product"."product_link", "Product"."product_img_link", "Product"."product_price" FROM "products" AS "Product" WHERE ( SELECT "product_filters"."filter_field_id" FROM "product_filters" AS "product_filters" INNER JOIN "filter_fields" AS "FilterField" ON "product_filters"."filter_field_id" = "FilterField"."id" AND ("FilterField"."field_name" = 'Product Details') WHERE ("Product"."id" = "product_filters"."product_id" AND ("product_filters"."filter_value" IN ('Kit'))) LIMIT 1 ) IS NOT NULL ORDER BY "Product"."product_price" ASC LIMIT 27 OFFSET 0) AS "Product" INNER JOIN ( "product_filters" AS "FilterFields->product_filters" INNER JOIN "filter_fields" AS "FilterFields" ON "FilterFields"."id" = "FilterFields->product_filters"."filter_field_id" AND ("FilterFields->product_filters"."filter_value" IN ('Kit'))) ON "Product"."id" = "FilterFields->product_filters"."product_id" AND ("FilterFields"."field_name" = 'Product Details') ORDER BY "Product"."product_price" ASC;




-- product_filters table
CREATE INDEX idx_product_filters_product_id
  ON product_filters (product_id);

CREATE INDEX idx_product_filters_filter_field_id
  ON product_filters (filter_field_id);

CREATE INDEX idx_product_filters_filter_value
  ON product_filters (filter_value);

-- filter_fields table
CREATE INDEX idx_filter_fields_field_name
  ON filter_fields (field_name);
