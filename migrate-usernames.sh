#!/bin/bash

# Load environment variables from .env
set -a
source .env 2>/dev/null || source .env.local 2>/dev/null
set +a

# Run the migration script
npx tsx scripts/migrate-usernames.ts
