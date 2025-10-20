-- Use Clearbit API for Companies
-- Remove the need to seed companies in the database
-- Companies will be fetched from Clearbit Autocomplete API

-- 1. Keep the companies table structure but don't require it for autocomplete
-- The table can be used for caching or user-added companies if needed in the future

-- 2. Clear existing seeded data since we're using Clearbit API
TRUNCATE TABLE public.companies;

-- 3. Companies are now fetched from Clearbit API at:
-- https://autocomplete.clearbit.com/v1/companies/suggest?query={search}
--
-- Benefits:
-- - Millions of companies worldwide (vs ~100 seeded)
-- - No maintenance required
-- - Always up-to-date
-- - Returns company domain names
-- - Completely free, no API key needed
-- - Similar architecture to Nominatim for locations

-- 4. The companies table is now optional and can be used for:
-- - Caching frequently searched companies
-- - User-submitted companies not in Clearbit
-- - Custom company metadata specific to your app
