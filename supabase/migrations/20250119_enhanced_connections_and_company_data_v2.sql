-- Enhanced Connections and Company Data Schema (Deadlock-Free Version)
-- Adds standardized company data, improved location handling, and connection privacy

-- 1. Add company field to users table (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'company'
  ) THEN
    ALTER TABLE public.users ADD COLUMN company text;
  END IF;
END $$;

-- 2. Create companies reference table for autocomplete
CREATE TABLE IF NOT EXISTS public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  domain text,
  logo_url text,
  industry text,
  size_range text,
  headquarters text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 3. Create locations reference table
CREATE TABLE IF NOT EXISTS public.locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text NOT NULL,
  state text,
  country text NOT NULL,
  formatted_address text NOT NULL UNIQUE,
  latitude decimal(10, 8),
  longitude decimal(11, 8),
  created_at timestamp with time zone DEFAULT now()
);

-- 4. Connection Privacy Settings (extends user_privacy_settings)
-- First check if the table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_privacy_settings'
  ) THEN
    -- Add show_connections_to column
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'user_privacy_settings' AND column_name = 'show_connections_to'
    ) THEN
      ALTER TABLE public.user_privacy_settings
      ADD COLUMN show_connections_to text DEFAULT 'everyone';
    END IF;

    -- Add show_connection_count column
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'user_privacy_settings' AND column_name = 'show_connection_count'
    ) THEN
      ALTER TABLE public.user_privacy_settings
      ADD COLUMN show_connection_count boolean DEFAULT true;
    END IF;

    -- Add constraint if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.constraint_column_usage
      WHERE table_schema = 'public' AND table_name = 'user_privacy_settings'
        AND constraint_name = 'user_privacy_settings_show_connections_to_check'
    ) THEN
      ALTER TABLE public.user_privacy_settings
      ADD CONSTRAINT user_privacy_settings_show_connections_to_check
      CHECK (show_connections_to IN ('everyone', 'connections', 'only_me'));
    END IF;
  END IF;
END $$;

-- 5. Add metadata to connections table for better filtering
-- Skip if connections table doesn't exist (will be handled by connections migration)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'connections'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'connections' AND column_name = 'metadata'
    ) THEN
      -- Use a more cautious approach with lower lock timeout
      SET LOCAL lock_timeout = '2s';
      ALTER TABLE public.connections ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;
    END IF;
  END IF;
EXCEPTION
  WHEN lock_not_available THEN
    RAISE NOTICE 'Could not add metadata column to connections table due to lock timeout. Please run this migration again when the table is not in use.';
END $$;

-- 6. Indexes for performance
CREATE INDEX IF NOT EXISTS companies_name_idx ON public.companies USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS companies_domain_idx ON public.companies (domain);
CREATE INDEX IF NOT EXISTS companies_industry_idx ON public.companies (industry);

CREATE INDEX IF NOT EXISTS locations_city_idx ON public.locations (city);
CREATE INDEX IF NOT EXISTS locations_country_idx ON public.locations (country);
CREATE INDEX IF NOT EXISTS locations_formatted_idx ON public.locations (formatted_address);

CREATE INDEX IF NOT EXISTS users_company_idx ON public.users (company);
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'graduation_year'
  ) THEN
    CREATE INDEX IF NOT EXISTS users_graduation_year_idx ON public.users (graduation_year);
  END IF;
END $$;

-- 7. RLS Policies for companies (read-only for authenticated users)
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'companies' AND policyname = 'Anyone can view companies'
  ) THEN
    CREATE POLICY "Anyone can view companies" ON public.companies FOR SELECT USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'companies' AND policyname = 'Only admins can insert companies'
  ) THEN
    CREATE POLICY "Only admins can insert companies" ON public.companies FOR INSERT WITH CHECK (false);
  END IF;
END $$;

-- 8. RLS Policies for locations
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'locations' AND policyname = 'Anyone can view locations'
  ) THEN
    CREATE POLICY "Anyone can view locations" ON public.locations FOR SELECT USING (true);
  END IF;
END $$;

-- 9. Seed popular companies (Top Tech Companies)
INSERT INTO public.companies (name, domain, industry, size_range, headquarters) VALUES
  ('Google', 'google.com', 'Technology', '10000+', 'Mountain View, CA'),
  ('Microsoft', 'microsoft.com', 'Technology', '10000+', 'Redmond, WA'),
  ('Amazon', 'amazon.com', 'E-commerce/Technology', '10000+', 'Seattle, WA'),
  ('Apple', 'apple.com', 'Technology', '10000+', 'Cupertino, CA'),
  ('Meta', 'meta.com', 'Technology', '10000+', 'Menlo Park, CA'),
  ('Netflix', 'netflix.com', 'Entertainment/Technology', '10000+', 'Los Gatos, CA'),
  ('Tesla', 'tesla.com', 'Automotive/Technology', '10000+', 'Austin, TX'),
  ('IBM', 'ibm.com', 'Technology', '10000+', 'Armonk, NY'),
  ('Oracle', 'oracle.com', 'Technology', '10000+', 'Austin, TX'),
  ('Salesforce', 'salesforce.com', 'Technology', '10000+', 'San Francisco, CA'),
  ('Adobe', 'adobe.com', 'Technology', '10000+', 'San Jose, CA'),
  ('Intel', 'intel.com', 'Technology', '10000+', 'Santa Clara, CA'),
  ('Nvidia', 'nvidia.com', 'Technology', '10000+', 'Santa Clara, CA'),
  ('Cisco', 'cisco.com', 'Technology', '10000+', 'San Jose, CA'),
  ('LinkedIn', 'linkedin.com', 'Technology', '10000+', 'Sunnyvale, CA'),
  ('Twitter', 'twitter.com', 'Technology', '1000-5000', 'San Francisco, CA'),
  ('Uber', 'uber.com', 'Technology', '10000+', 'San Francisco, CA'),
  ('Airbnb', 'airbnb.com', 'Technology', '5000-10000', 'San Francisco, CA'),
  ('Stripe', 'stripe.com', 'FinTech', '1000-5000', 'San Francisco, CA'),
  ('Databricks', 'databricks.com', 'Technology', '1000-5000', 'San Francisco, CA'),
  ('Snowflake', 'snowflake.com', 'Technology', '1000-5000', 'San Mateo, CA'),
  ('Atlassian', 'atlassian.com', 'Technology', '5000-10000', 'Sydney, Australia'),
  ('Shopify', 'shopify.com', 'E-commerce', '5000-10000', 'Ottawa, Canada'),
  ('Square', 'squareup.com', 'FinTech', '5000-10000', 'San Francisco, CA'),
  ('Spotify', 'spotify.com', 'Entertainment/Technology', '5000-10000', 'Stockholm, Sweden'),
  ('GitHub', 'github.com', 'Technology', '1000-5000', 'San Francisco, CA'),
  ('GitLab', 'gitlab.com', 'Technology', '1000-5000', 'Remote'),
  ('Figma', 'figma.com', 'Technology', '500-1000', 'San Francisco, CA'),
  ('Notion', 'notion.so', 'Technology', '100-500', 'San Francisco, CA'),
  ('OpenAI', 'openai.com', 'AI/Technology', '100-500', 'San Francisco, CA'),
  ('Anthropic', 'anthropic.com', 'AI/Technology', '100-500', 'San Francisco, CA'),
  ('DeepMind', 'deepmind.com', 'AI/Technology', '1000-5000', 'London, UK'),
  ('Palantir', 'palantir.com', 'Technology', '1000-5000', 'Denver, CO'),
  ('DoorDash', 'doordash.com', 'Technology', '5000-10000', 'San Francisco, CA'),
  ('Instacart', 'instacart.com', 'Technology', '1000-5000', 'San Francisco, CA'),
  ('Robinhood', 'robinhood.com', 'FinTech', '1000-5000', 'Menlo Park, CA'),
  ('Coinbase', 'coinbase.com', 'FinTech', '1000-5000', 'San Francisco, CA'),
  ('Twilio', 'twilio.com', 'Technology', '5000-10000', 'San Francisco, CA'),
  ('Zoom', 'zoom.us', 'Technology', '5000-10000', 'San Jose, CA'),
  ('Slack', 'slack.com', 'Technology', '1000-5000', 'San Francisco, CA')
ON CONFLICT (name) DO NOTHING;

-- 10. Seed major locations
INSERT INTO public.locations (city, state, country, formatted_address) VALUES
  ('San Francisco', 'CA', 'USA', 'San Francisco, CA, USA'),
  ('New York', 'NY', 'USA', 'New York, NY, USA'),
  ('Los Angeles', 'CA', 'USA', 'Los Angeles, CA, USA'),
  ('Seattle', 'WA', 'USA', 'Seattle, WA, USA'),
  ('Austin', 'TX', 'USA', 'Austin, TX, USA'),
  ('Boston', 'MA', 'USA', 'Boston, MA, USA'),
  ('Chicago', 'IL', 'USA', 'Chicago, IL, USA'),
  ('Denver', 'CO', 'USA', 'Denver, CO, USA'),
  ('Atlanta', 'GA', 'USA', 'Atlanta, GA, USA'),
  ('Miami', 'FL', 'USA', 'Miami, FL, USA'),
  ('Remote', '', 'Global', 'Remote'),
  ('Mountain View', 'CA', 'USA', 'Mountain View, CA, USA'),
  ('Palo Alto', 'CA', 'USA', 'Palo Alto, CA, USA'),
  ('Menlo Park', 'CA', 'USA', 'Menlo Park, CA, USA'),
  ('Cupertino', 'CA', 'USA', 'Cupertino, CA, USA'),
  ('Redmond', 'WA', 'USA', 'Redmond, WA, USA'),
  ('London', '', 'UK', 'London, UK'),
  ('Toronto', 'ON', 'Canada', 'Toronto, ON, Canada'),
  ('Vancouver', 'BC', 'Canada', 'Vancouver, BC, Canada'),
  ('Sydney', '', 'Australia', 'Sydney, Australia')
ON CONFLICT (formatted_address) DO NOTHING;

-- 11. Function to get connection count with privacy
CREATE OR REPLACE FUNCTION get_connection_count(p_user_id uuid, p_viewer_id uuid)
RETURNS integer AS $$
DECLARE
  v_count integer;
  v_privacy text;
  v_is_connection boolean;
  v_show_count boolean;
BEGIN
  -- Default values if privacy settings don't exist
  v_privacy := 'everyone';
  v_show_count := true;

  -- Get user's privacy settings (if table exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_privacy_settings'
  ) THEN
    SELECT
      COALESCE(ups.show_connections_to, 'everyone'),
      COALESCE(ups.show_connection_count, true)
    INTO v_privacy, v_show_count
    FROM public.user_privacy_settings ups
    WHERE ups.user_id = p_user_id;
  END IF;

  -- If user doesn't want to show count
  IF v_show_count = false AND p_user_id != p_viewer_id THEN
    RETURN -1; -- Indicates hidden
  END IF;

  -- Check if viewer is a connection
  SELECT EXISTS (
    SELECT 1 FROM public.connections
    WHERE ((from_user_id = p_viewer_id AND to_user_id = p_user_id)
       OR (from_user_id = p_user_id AND to_user_id = p_viewer_id))
      AND status = 'accepted'
  ) INTO v_is_connection;

  -- Apply privacy rules
  IF p_user_id = p_viewer_id THEN
    -- Own profile, always show
    v_privacy := 'everyone';
  ELSIF v_privacy = 'only_me' THEN
    RETURN -1;
  ELSIF v_privacy = 'connections' AND v_is_connection = false THEN
    RETURN -1;
  END IF;

  -- Get actual count
  SELECT COUNT(*)
  INTO v_count
  FROM public.connections
  WHERE (from_user_id = p_user_id OR to_user_id = p_user_id)
    AND status = 'accepted';

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Function to get connections list with privacy
CREATE OR REPLACE FUNCTION get_user_connections(
  p_user_id uuid,
  p_viewer_id uuid,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  user_id uuid,
  username text,
  full_name text,
  avatar_url text,
  bio text,
  university text,
  graduation_year text,
  company text,
  location text,
  job_title text,
  connected_at timestamp with time zone,
  mutual_connections_count integer
) AS $$
DECLARE
  v_privacy text;
  v_is_connection boolean;
BEGIN
  -- Default privacy
  v_privacy := 'everyone';

  -- Get user's privacy settings (if table exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_privacy_settings'
  ) THEN
    SELECT COALESCE(ups.show_connections_to, 'everyone')
    INTO v_privacy
    FROM public.user_privacy_settings ups
    WHERE ups.user_id = p_user_id;
  END IF;

  -- Check if viewer is a connection
  SELECT EXISTS (
    SELECT 1 FROM public.connections
    WHERE ((from_user_id = p_viewer_id AND to_user_id = p_user_id)
       OR (from_user_id = p_user_id AND to_user_id = p_viewer_id))
      AND status = 'accepted'
  ) INTO v_is_connection;

  -- Check privacy
  IF p_user_id != p_viewer_id THEN
    IF v_privacy = 'only_me' THEN
      RETURN; -- Empty result
    ELSIF v_privacy = 'connections' AND v_is_connection = false THEN
      RETURN; -- Empty result
    END IF;
  END IF;

  -- Return connections
  RETURN QUERY
  SELECT
    u.user_id,
    u.username,
    u.full_name,
    u.avatar_url,
    u.bio,
    u.university,
    u.graduation_year,
    u.company,
    u.location,
    u.job_title,
    c.created_at as connected_at,
    (
      SELECT COUNT(*)::integer
      FROM public.connections c2
      WHERE c2.status = 'accepted'
        AND (
          (c2.from_user_id = u.user_id AND EXISTS (
            SELECT 1 FROM public.connections c3
            WHERE c3.status = 'accepted'
              AND ((c3.from_user_id = p_viewer_id AND c3.to_user_id = c2.to_user_id)
                OR (c3.to_user_id = p_viewer_id AND c3.from_user_id = c2.to_user_id))
          ))
          OR
          (c2.to_user_id = u.user_id AND EXISTS (
            SELECT 1 FROM public.connections c3
            WHERE c3.status = 'accepted'
              AND ((c3.from_user_id = p_viewer_id AND c3.to_user_id = c2.from_user_id)
                OR (c3.to_user_id = p_viewer_id AND c3.from_user_id = c2.from_user_id))
          ))
        )
    ) as mutual_connections_count
  FROM public.connections c
  JOIN public.users u ON (
    CASE
      WHEN c.from_user_id = p_user_id THEN u.user_id = c.to_user_id
      ELSE u.user_id = c.from_user_id
    END
  )
  WHERE (c.from_user_id = p_user_id OR c.to_user_id = p_user_id)
    AND c.status = 'accepted'
  ORDER BY c.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT ON public.companies TO authenticated;
GRANT SELECT ON public.locations TO authenticated;
GRANT EXECUTE ON FUNCTION get_connection_count(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_connections(uuid, uuid, integer, integer) TO authenticated;
