#!/bin/bash

# Set environment variables from .env
export PGPASSWORD="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5oeGphc2hyZWd1b2ZhbGhhb2ZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzUwODg0NCwiZXhwIjoyMDU5MDg0ODQ0fQ.EZWUlp5MkaMBohd8VZEf_2qUO8xYz1jofkaAw1ITilQ"

# Execute the SQL file against Supabase
psql -h db.nhxjashreguofalhaofj.supabase.co \
     -p 6543 \
     -d postgres \
     -U postgres \
     -f COMPLETE_MENTION_SYSTEM_FIX.sql \
     -v ON_ERROR_STOP=1 \
     --echo-all

echo "SQL fix execution completed!"