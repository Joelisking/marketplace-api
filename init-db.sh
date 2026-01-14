#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create test database if it doesn't exist
    SELECT 'CREATE DATABASE marketplace_test'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'marketplace_test')\gexec

    -- Fix collation version mismatches
    ALTER DATABASE marketplace REFRESH COLLATION VERSION;
    ALTER DATABASE marketplace_test REFRESH COLLATION VERSION;
    ALTER DATABASE template1 REFRESH COLLATION VERSION;
    ALTER DATABASE postgres REFRESH COLLATION VERSION;
EOSQL

echo "Database initialization complete!"
