# Demo seed migration fix

Older stores tables may lack last_seen_at. The previous db:migrate only added
that column to deals, although the demo seed writes it to both tables.

This release adds the missing idempotent ALTER TABLE and updates db:check to
verify the columns used by demo seeding. Existing records are preserved.

From the updated repository, keeping your existing apps/api/.env:

```sh
yarn db:migrate
yarn db:seed:demo
yarn db:check
```

Expect the seed to report 6 stores and 48 deals. Keep DATA_PROVIDER=postgres.
Restart the API with `yarn dev:api` and refresh the Stores page.

If patching your current checkout manually, append this to database/schema.sql
before running the commands above:

```sql
ALTER TABLE stores ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;
```

Validation: reproduced the missing column in an embedded PostgreSQL database,
applied the schema twice, and successfully seeded/refreshed 6 stores and 48 deals
without creating accounts. A regression case is also included in the optional
`yarn test:postgres` suite. That standalone suite requires TEST_DATABASE_URL and
was not run against a standalone PostgreSQL server here.
