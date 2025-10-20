-- Fix Companies Table and Enhance Locations
-- Remove location-specific data from companies (they have multiple offices)
-- Enhance locations table with comprehensive world cities

-- 1. Update companies table - remove headquarters (companies have multiple offices)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'companies' AND column_name = 'headquarters'
  ) THEN
    ALTER TABLE public.companies DROP COLUMN headquarters;
  END IF;
END $$;

-- 2. Clear existing location data (was company HQ focused, not user locations)
TRUNCATE TABLE public.locations;

-- 3. Add more comprehensive location data for major world cities
-- This is for where USERS live, not company headquarters
INSERT INTO public.locations (city, state, country, formatted_address) VALUES
  -- United States - Major Cities
  ('New York', 'NY', 'USA', 'New York, NY, USA'),
  ('Los Angeles', 'CA', 'USA', 'Los Angeles, CA, USA'),
  ('Chicago', 'IL', 'USA', 'Chicago, IL, USA'),
  ('Houston', 'TX', 'USA', 'Houston, TX, USA'),
  ('Phoenix', 'AZ', 'USA', 'Phoenix, AZ, USA'),
  ('Philadelphia', 'PA', 'USA', 'Philadelphia, PA, USA'),
  ('San Antonio', 'TX', 'USA', 'San Antonio, TX, USA'),
  ('San Diego', 'CA', 'USA', 'San Diego, CA, USA'),
  ('Dallas', 'TX', 'USA', 'Dallas, TX, USA'),
  ('San Jose', 'CA', 'USA', 'San Jose, CA, USA'),
  ('Austin', 'TX', 'USA', 'Austin, TX, USA'),
  ('Jacksonville', 'FL', 'USA', 'Jacksonville, FL, USA'),
  ('Fort Worth', 'TX', 'USA', 'Fort Worth, TX, USA'),
  ('Columbus', 'OH', 'USA', 'Columbus, OH, USA'),
  ('Charlotte', 'NC', 'USA', 'Charlotte, NC, USA'),
  ('San Francisco', 'CA', 'USA', 'San Francisco, CA, USA'),
  ('Indianapolis', 'IN', 'USA', 'Indianapolis, IN, USA'),
  ('Seattle', 'WA', 'USA', 'Seattle, WA, USA'),
  ('Denver', 'CO', 'USA', 'Denver, CO, USA'),
  ('Washington', 'DC', 'USA', 'Washington, DC, USA'),
  ('Boston', 'MA', 'USA', 'Boston, MA, USA'),
  ('Nashville', 'TN', 'USA', 'Nashville, TN, USA'),
  ('Detroit', 'MI', 'USA', 'Detroit, MI, USA'),
  ('Portland', 'OR', 'USA', 'Portland, OR, USA'),
  ('Las Vegas', 'NV', 'USA', 'Las Vegas, NV, USA'),
  ('Memphis', 'TN', 'USA', 'Memphis, TN, USA'),
  ('Louisville', 'KY', 'USA', 'Louisville, KY, USA'),
  ('Baltimore', 'MD', 'USA', 'Baltimore, MD, USA'),
  ('Milwaukee', 'WI', 'USA', 'Milwaukee, WI, USA'),
  ('Albuquerque', 'NM', 'USA', 'Albuquerque, NM, USA'),
  ('Tucson', 'AZ', 'USA', 'Tucson, AZ, USA'),
  ('Fresno', 'CA', 'USA', 'Fresno, CA, USA'),
  ('Sacramento', 'CA', 'USA', 'Sacramento, CA, USA'),
  ('Mesa', 'AZ', 'USA', 'Mesa, AZ, USA'),
  ('Atlanta', 'GA', 'USA', 'Atlanta, GA, USA'),
  ('Kansas City', 'MO', 'USA', 'Kansas City, MO, USA'),
  ('Colorado Springs', 'CO', 'USA', 'Colorado Springs, CO, USA'),
  ('Raleigh', 'NC', 'USA', 'Raleigh, NC, USA'),
  ('Miami', 'FL', 'USA', 'Miami, FL, USA'),
  ('Long Beach', 'CA', 'USA', 'Long Beach, CA, USA'),
  ('Virginia Beach', 'VA', 'USA', 'Virginia Beach, VA, USA'),
  ('Oakland', 'CA', 'USA', 'Oakland, CA, USA'),
  ('Minneapolis', 'MN', 'USA', 'Minneapolis, MN, USA'),
  ('Tampa', 'FL', 'USA', 'Tampa, FL, USA'),
  ('Tulsa', 'OK', 'USA', 'Tulsa, OK, USA'),
  ('Arlington', 'TX', 'USA', 'Arlington, TX, USA'),
  ('New Orleans', 'LA', 'USA', 'New Orleans, LA, USA'),
  ('Mountain View', 'CA', 'USA', 'Mountain View, CA, USA'),
  ('Palo Alto', 'CA', 'USA', 'Palo Alto, CA, USA'),
  ('Menlo Park', 'CA', 'USA', 'Menlo Park, CA, USA'),
  ('Cupertino', 'CA', 'USA', 'Cupertino, CA, USA'),
  ('Santa Clara', 'CA', 'USA', 'Santa Clara, CA, USA'),
  ('Redmond', 'WA', 'USA', 'Redmond, WA, USA'),
  ('Cambridge', 'MA', 'USA', 'Cambridge, MA, USA'),
  ('Ann Arbor', 'MI', 'USA', 'Ann Arbor, MI, USA'),
  ('Boulder', 'CO', 'USA', 'Boulder, CO, USA'),
  ('Irvine', 'CA', 'USA', 'Irvine, CA, USA'),

  -- Canada
  ('Toronto', 'ON', 'Canada', 'Toronto, ON, Canada'),
  ('Montreal', 'QC', 'Canada', 'Montreal, QC, Canada'),
  ('Vancouver', 'BC', 'Canada', 'Vancouver, BC, Canada'),
  ('Calgary', 'AB', 'Canada', 'Calgary, AB, Canada'),
  ('Edmonton', 'AB', 'Canada', 'Edmonton, AB, Canada'),
  ('Ottawa', 'ON', 'Canada', 'Ottawa, ON, Canada'),
  ('Winnipeg', 'MB', 'Canada', 'Winnipeg, MB, Canada'),
  ('Quebec City', 'QC', 'Canada', 'Quebec City, QC, Canada'),
  ('Hamilton', 'ON', 'Canada', 'Hamilton, ON, Canada'),
  ('Kitchener', 'ON', 'Canada', 'Kitchener, ON, Canada'),
  ('Waterloo', 'ON', 'Canada', 'Waterloo, ON, Canada'),

  -- United Kingdom
  ('London', '', 'UK', 'London, UK'),
  ('Manchester', '', 'UK', 'Manchester, UK'),
  ('Birmingham', '', 'UK', 'Birmingham, UK'),
  ('Leeds', '', 'UK', 'Leeds, UK'),
  ('Glasgow', '', 'UK', 'Glasgow, UK'),
  ('Liverpool', '', 'UK', 'Liverpool, UK'),
  ('Newcastle', '', 'UK', 'Newcastle, UK'),
  ('Sheffield', '', 'UK', 'Sheffield, UK'),
  ('Bristol', '', 'UK', 'Bristol, UK'),
  ('Edinburgh', '', 'UK', 'Edinburgh, UK'),
  ('Cambridge', '', 'UK', 'Cambridge, UK'),
  ('Oxford', '', 'UK', 'Oxford, UK'),

  -- Europe
  ('Berlin', '', 'Germany', 'Berlin, Germany'),
  ('Munich', '', 'Germany', 'Munich, Germany'),
  ('Hamburg', '', 'Germany', 'Hamburg, Germany'),
  ('Frankfurt', '', 'Germany', 'Frankfurt, Germany'),
  ('Paris', '', 'France', 'Paris, France'),
  ('Lyon', '', 'France', 'Lyon, France'),
  ('Marseille', '', 'France', 'Marseille, France'),
  ('Amsterdam', '', 'Netherlands', 'Amsterdam, Netherlands'),
  ('Rotterdam', '', 'Netherlands', 'Rotterdam, Netherlands'),
  ('Brussels', '', 'Belgium', 'Brussels, Belgium'),
  ('Madrid', '', 'Spain', 'Madrid, Spain'),
  ('Barcelona', '', 'Spain', 'Barcelona, Spain'),
  ('Rome', '', 'Italy', 'Rome, Italy'),
  ('Milan', '', 'Italy', 'Milan, Italy'),
  ('Stockholm', '', 'Sweden', 'Stockholm, Sweden'),
  ('Copenhagen', '', 'Denmark', 'Copenhagen, Denmark'),
  ('Oslo', '', 'Norway', 'Oslo, Norway'),
  ('Helsinki', '', 'Finland', 'Helsinki, Finland'),
  ('Dublin', '', 'Ireland', 'Dublin, Ireland'),
  ('Zurich', '', 'Switzerland', 'Zurich, Switzerland'),
  ('Vienna', '', 'Austria', 'Vienna, Austria'),
  ('Prague', '', 'Czech Republic', 'Prague, Czech Republic'),
  ('Warsaw', '', 'Poland', 'Warsaw, Poland'),
  ('Lisbon', '', 'Portugal', 'Lisbon, Portugal'),

  -- Asia
  ('Tokyo', '', 'Japan', 'Tokyo, Japan'),
  ('Osaka', '', 'Japan', 'Osaka, Japan'),
  ('Kyoto', '', 'Japan', 'Kyoto, Japan'),
  ('Seoul', '', 'South Korea', 'Seoul, South Korea'),
  ('Busan', '', 'South Korea', 'Busan, South Korea'),
  ('Beijing', '', 'China', 'Beijing, China'),
  ('Shanghai', '', 'China', 'Shanghai, China'),
  ('Shenzhen', '', 'China', 'Shenzhen, China'),
  ('Guangzhou', '', 'China', 'Guangzhou, China'),
  ('Hong Kong', '', 'Hong Kong', 'Hong Kong'),
  ('Singapore', '', 'Singapore', 'Singapore'),
  ('Bangalore', '', 'India', 'Bangalore, India'),
  ('Mumbai', '', 'India', 'Mumbai, India'),
  ('Delhi', '', 'India', 'Delhi, India'),
  ('Hyderabad', '', 'India', 'Hyderabad, India'),
  ('Pune', '', 'India', 'Pune, India'),
  ('Chennai', '', 'India', 'Chennai, India'),
  ('Kolkata', '', 'India', 'Kolkata, India'),
  ('Tel Aviv', '', 'Israel', 'Tel Aviv, Israel'),
  ('Dubai', '', 'UAE', 'Dubai, UAE'),
  ('Abu Dhabi', '', 'UAE', 'Abu Dhabi, UAE'),
  ('Bangkok', '', 'Thailand', 'Bangkok, Thailand'),
  ('Jakarta', '', 'Indonesia', 'Jakarta, Indonesia'),
  ('Manila', '', 'Philippines', 'Manila, Philippines'),
  ('Kuala Lumpur', '', 'Malaysia', 'Kuala Lumpur, Malaysia'),

  -- Australia & New Zealand
  ('Sydney', 'NSW', 'Australia', 'Sydney, Australia'),
  ('Melbourne', 'VIC', 'Australia', 'Melbourne, Australia'),
  ('Brisbane', 'QLD', 'Australia', 'Brisbane, Australia'),
  ('Perth', 'WA', 'Australia', 'Perth, Australia'),
  ('Adelaide', 'SA', 'Australia', 'Adelaide, Australia'),
  ('Auckland', '', 'New Zealand', 'Auckland, New Zealand'),
  ('Wellington', '', 'New Zealand', 'Wellington, New Zealand'),

  -- Latin America
  ('Mexico City', '', 'Mexico', 'Mexico City, Mexico'),
  ('Guadalajara', '', 'Mexico', 'Guadalajara, Mexico'),
  ('Monterrey', '', 'Mexico', 'Monterrey, Mexico'),
  ('São Paulo', '', 'Brazil', 'São Paulo, Brazil'),
  ('Rio de Janeiro', '', 'Brazil', 'Rio de Janeiro, Brazil'),
  ('Buenos Aires', '', 'Argentina', 'Buenos Aires, Argentina'),
  ('Santiago', '', 'Chile', 'Santiago, Chile'),
  ('Bogotá', '', 'Colombia', 'Bogotá, Colombia'),
  ('Lima', '', 'Peru', 'Lima, Peru'),

  -- Africa
  ('Cape Town', '', 'South Africa', 'Cape Town, South Africa'),
  ('Johannesburg', '', 'South Africa', 'Johannesburg, South Africa'),
  ('Nairobi', '', 'Kenya', 'Nairobi, Kenya'),
  ('Lagos', '', 'Nigeria', 'Lagos, Nigeria'),
  ('Cairo', '', 'Egypt', 'Cairo, Egypt'),

  -- Remote/Other
  ('Remote', '', 'Global', 'Remote')
ON CONFLICT (formatted_address) DO NOTHING;

-- 4. Add comprehensive company data (without location-specific info)
TRUNCATE TABLE public.companies;

INSERT INTO public.companies (name, domain, industry, size_range) VALUES
  -- Major Tech Companies
  ('Google', 'google.com', 'Technology', '10000+'),
  ('Microsoft', 'microsoft.com', 'Technology', '10000+'),
  ('Amazon', 'amazon.com', 'E-commerce/Technology', '10000+'),
  ('Apple', 'apple.com', 'Technology', '10000+'),
  ('Meta', 'meta.com', 'Technology', '10000+'),
  ('Netflix', 'netflix.com', 'Entertainment/Technology', '10000+'),
  ('Tesla', 'tesla.com', 'Automotive/Technology', '10000+'),
  ('IBM', 'ibm.com', 'Technology', '10000+'),
  ('Oracle', 'oracle.com', 'Technology', '10000+'),
  ('Salesforce', 'salesforce.com', 'Technology', '10000+'),
  ('Adobe', 'adobe.com', 'Technology', '10000+'),
  ('Intel', 'intel.com', 'Technology', '10000+'),
  ('Nvidia', 'nvidia.com', 'Technology', '10000+'),
  ('AMD', 'amd.com', 'Technology', '10000+'),
  ('Qualcomm', 'qualcomm.com', 'Technology', '10000+'),
  ('Cisco', 'cisco.com', 'Technology', '10000+'),
  ('LinkedIn', 'linkedin.com', 'Technology', '10000+'),
  ('X (Twitter)', 'x.com', 'Technology', '1000-5000'),
  ('Uber', 'uber.com', 'Technology', '10000+'),
  ('Lyft', 'lyft.com', 'Technology', '1000-5000'),
  ('Airbnb', 'airbnb.com', 'Technology', '5000-10000'),
  ('Stripe', 'stripe.com', 'FinTech', '5000-10000'),
  ('Square (Block)', 'squareup.com', 'FinTech', '5000-10000'),
  ('PayPal', 'paypal.com', 'FinTech', '10000+'),
  ('Databricks', 'databricks.com', 'Technology', '5000-10000'),
  ('Snowflake', 'snowflake.com', 'Technology', '5000-10000'),
  ('Atlassian', 'atlassian.com', 'Technology', '10000+'),
  ('Shopify', 'shopify.com', 'E-commerce', '10000+'),
  ('Spotify', 'spotify.com', 'Entertainment/Technology', '5000-10000'),
  ('GitHub', 'github.com', 'Technology', '1000-5000'),
  ('GitLab', 'gitlab.com', 'Technology', '1000-5000'),
  ('Figma', 'figma.com', 'Technology', '1000-5000'),
  ('Notion', 'notion.so', 'Technology', '500-1000'),
  ('Slack', 'slack.com', 'Technology', '1000-5000'),
  ('Zoom', 'zoom.us', 'Technology', '5000-10000'),
  ('Dropbox', 'dropbox.com', 'Technology', '1000-5000'),
  ('Box', 'box.com', 'Technology', '1000-5000'),
  ('Twilio', 'twilio.com', 'Technology', '5000-10000'),
  ('SendGrid', 'sendgrid.com', 'Technology', '500-1000'),

  -- AI & Machine Learning
  ('OpenAI', 'openai.com', 'AI/Technology', '500-1000'),
  ('Anthropic', 'anthropic.com', 'AI/Technology', '100-500'),
  ('DeepMind', 'deepmind.com', 'AI/Technology', '1000-5000'),
  ('Cohere', 'cohere.ai', 'AI/Technology', '100-500'),
  ('Hugging Face', 'huggingface.co', 'AI/Technology', '100-500'),
  ('Scale AI', 'scale.com', 'AI/Technology', '500-1000'),
  ('DataRobot', 'datarobot.com', 'AI/Technology', '1000-5000'),

  -- Delivery & Transportation
  ('DoorDash', 'doordash.com', 'Technology', '5000-10000'),
  ('Instacart', 'instacart.com', 'Technology', '1000-5000'),
  ('Postmates', 'postmates.com', 'Technology', '100-500'),
  ('Grubhub', 'grubhub.com', 'Technology', '1000-5000'),

  -- FinTech
  ('Robinhood', 'robinhood.com', 'FinTech', '1000-5000'),
  ('Coinbase', 'coinbase.com', 'FinTech', '1000-5000'),
  ('Plaid', 'plaid.com', 'FinTech', '500-1000'),
  ('Chime', 'chime.com', 'FinTech', '1000-5000'),
  ('SoFi', 'sofi.com', 'FinTech', '1000-5000'),
  ('Affirm', 'affirm.com', 'FinTech', '1000-5000'),
  ('Klarna', 'klarna.com', 'FinTech', '5000-10000'),

  -- Security & Infrastructure
  ('Palantir', 'palantir.com', 'Technology', '5000-10000'),
  ('Cloudflare', 'cloudflare.com', 'Technology', '1000-5000'),
  ('CrowdStrike', 'crowdstrike.com', 'Cybersecurity', '5000-10000'),
  ('Okta', 'okta.com', 'Technology', '5000-10000'),
  ('Palo Alto Networks', 'paloaltonetworks.com', 'Cybersecurity', '10000+'),
  ('Datadog', 'datadoghq.com', 'Technology', '1000-5000'),
  ('MongoDB', 'mongodb.com', 'Technology', '1000-5000'),
  ('Redis', 'redis.com', 'Technology', '100-500'),
  ('Elastic', 'elastic.co', 'Technology', '1000-5000'),
  ('HashiCorp', 'hashicorp.com', 'Technology', '1000-5000'),

  -- Gaming & Entertainment
  ('Roblox', 'roblox.com', 'Gaming', '1000-5000'),
  ('Unity', 'unity.com', 'Gaming/Technology', '5000-10000'),
  ('Epic Games', 'epicgames.com', 'Gaming', '1000-5000'),
  ('Riot Games', 'riotgames.com', 'Gaming', '1000-5000'),
  ('Discord', 'discord.com', 'Technology', '500-1000'),
  ('Twitch', 'twitch.tv', 'Entertainment', '1000-5000'),

  -- Social & Communication
  ('Snap Inc', 'snap.com', 'Technology', '5000-10000'),
  ('Pinterest', 'pinterest.com', 'Technology', '1000-5000'),
  ('Reddit', 'reddit.com', 'Technology', '1000-5000'),
  ('TikTok (ByteDance)', 'tiktok.com', 'Technology', '10000+'),

  -- E-commerce & Retail
  ('Shopify', 'shopify.com', 'E-commerce', '10000+'),
  ('Etsy', 'etsy.com', 'E-commerce', '1000-5000'),
  ('eBay', 'ebay.com', 'E-commerce', '10000+'),
  ('Walmart', 'walmart.com', 'Retail', '10000+'),
  ('Target', 'target.com', 'Retail', '10000+'),

  -- Consulting & Professional Services
  ('Deloitte', 'deloitte.com', 'Consulting', '10000+'),
  ('PwC', 'pwc.com', 'Consulting', '10000+'),
  ('EY', 'ey.com', 'Consulting', '10000+'),
  ('KPMG', 'kpmg.com', 'Consulting', '10000+'),
  ('Accenture', 'accenture.com', 'Consulting', '10000+'),
  ('McKinsey & Company', 'mckinsey.com', 'Consulting', '10000+'),
  ('Boston Consulting Group', 'bcg.com', 'Consulting', '10000+'),
  ('Bain & Company', 'bain.com', 'Consulting', '5000-10000'),

  -- Startups & Unicorns
  ('Canva', 'canva.com', 'Technology', '1000-5000'),
  ('Figma', 'figma.com', 'Technology', '1000-5000'),
  ('Airtable', 'airtable.com', 'Technology', '500-1000'),
  ('Asana', 'asana.com', 'Technology', '1000-5000'),
  ('Miro', 'miro.com', 'Technology', '1000-5000'),
  ('Webflow', 'webflow.com', 'Technology', '500-1000'),
  ('Vercel', 'vercel.com', 'Technology', '100-500')
ON CONFLICT (name) DO NOTHING;

-- 6. Create index for location search
CREATE INDEX IF NOT EXISTS locations_search_idx ON public.locations
  USING gin(to_tsvector('english', formatted_address || ' ' || city || ' ' || COALESCE(state, '') || ' ' || country));

-- 7. Create index for city search
CREATE INDEX IF NOT EXISTS locations_city_search_idx ON public.locations (city);
