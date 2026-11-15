-- NEXURE&LAND Sale tab: optional discounted price for products
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS sale_price numeric;

-- Keep sale prices valid: blank (NULL) or a positive value below the regular price.
ALTER TABLE public.products
DROP CONSTRAINT IF EXISTS products_sale_price_valid;
ALTER TABLE public.products
ADD CONSTRAINT products_sale_price_valid
CHECK (sale_price IS NULL OR (sale_price > 0 AND sale_price < price));
