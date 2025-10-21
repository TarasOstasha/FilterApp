-- Performance Optimization Indexes for Filter App
-- Run these SQL commands in your PostgreSQL database to improve query performance

-- Index on product_filters for faster joins and lookups
CREATE INDEX IF NOT EXISTS idx_product_filters_product_id ON product_filters(product_id);
CREATE INDEX IF NOT EXISTS idx_product_filters_filter_field_id ON product_filters(filter_field_id);
CREATE INDEX IF NOT EXISTS idx_product_filters_composite ON product_filters(product_id, filter_field_id);

-- Index on filter_fields for faster lookups by field_name
CREATE INDEX IF NOT EXISTS idx_filter_fields_field_name ON filter_fields(field_name);
CREATE INDEX IF NOT EXISTS idx_filter_fields_sort_order ON filter_fields(sort_order);

-- Index on product_categories for faster category filtering
CREATE INDEX IF NOT EXISTS idx_product_categories_product_id ON product_categories(product_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_category_id ON product_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_composite ON product_categories(product_id, category_id);

-- Index on products for price filtering
CREATE INDEX IF NOT EXISTS idx_products_price ON products(product_price);

-- GIN index on filter_value for faster array operations (if using PostgreSQL array operations)
-- This helps with the string_to_array operations
CREATE INDEX IF NOT EXISTS idx_product_filters_filter_value_gin ON product_filters USING gin (string_to_array(filter_value, ','));

-- Analyze tables to update statistics for query planner
ANALYZE product_filters;
ANALYZE filter_fields;
ANALYZE product_categories;
ANALYZE products;
