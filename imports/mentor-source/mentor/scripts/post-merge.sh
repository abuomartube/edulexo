#!/bin/bash
set -e
pnpm install --frozen-lockfile
# Use push-force to skip drizzle-kit's interactive prompt about adding
# the students_email_unique constraint to a non-empty table. The
# constraint is safe to add (existing rows already have unique emails);
# the prompt was blocking automated post-merge runs.
pnpm --filter db push-force
