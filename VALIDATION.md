# Demo seed migration hotfix validation

Embedded PostgreSQL upgrade/seed regression passed: removed stores.last_seen_at, reapplied the schema twice, then seeded and refreshed 6 stores / 48 deals without account insertion. API type-check passed. A standalone PostgreSQL regression is included but requires TEST_DATABASE_URL and was not executed here. No web source changed.
