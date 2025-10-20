-- Fix Companies Table for Nominatim Integration
-- Remove location-specific data from companies (they have multiple offices)
-- We now use Nominatim API for locations instead of seeding them

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

-- 2. We no longer seed locations - using Nominatim API instead
-- Keep the locations table for any cached/saved locations, but don't require it

-- 3. Update companies data - remove headquarters from existing entries and add comprehensive list
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
  ('Airtable', 'airtable.com', 'Technology', '500-1000'),
  ('Asana', 'asana.com', 'Technology', '1000-5000'),
  ('Miro', 'miro.com', 'Technology', '1000-5000'),
  ('Webflow', 'webflow.com', 'Technology', '500-1000'),
  ('Vercel', 'vercel.com', 'Technology', '100-500')
ON CONFLICT (name) DO NOTHING;
