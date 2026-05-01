#!/usr/bin/env tsx
/**
 * Verify the Replit ↔ GitHub connection has push access to abuomartube/mentor.
 *
 * This is the verification step for task #61
 * ("Connect GitHub so future pushes from this app go through automatically").
 *
 * Run from the project root:
 *   pnpm --filter @workspace/scripts exec tsx ./src/verify-github-connection.ts
 *
 * Exits 0 if the connection authenticates as a user with push permission on
 * abuomartube/mentor. Exits non-zero (with a clear message) otherwise.
 */

const REPO = "abuomartube/mentor";

type GitHubRepo = {
  full_name: string;
  default_branch: string;
  permissions?: {
    admin?: boolean;
    maintain?: boolean;
    push?: boolean;
    triage?: boolean;
    pull?: boolean;
  };
};

type GitHubUser = { login: string };

async function getConnectorToken(): Promise<string> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken =
    process.env.REPL_IDENTITY
      ? `repl ${process.env.REPL_IDENTITY}`
      : process.env.WEB_REPL_RENEWAL
        ? `depl ${process.env.WEB_REPL_RENEWAL}`
        : null;

  if (!hostname || !xReplitToken) {
    throw new Error(
      "Replit connector environment variables are missing. Run this from inside the Replit workspace.",
    );
  }

  const url = `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=github`;
  const res = await fetch(url, {
    headers: { Accept: "application/json", X_REPLIT_TOKEN: xReplitToken },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch connection: ${res.status} ${await res.text()}`);
  }
  const body = (await res.json()) as {
    items?: Array<{ settings?: { access_token?: string; oauth?: { credentials?: { access_token?: string } } } }>;
  };
  const item = body.items?.[0];
  const token =
    item?.settings?.access_token ?? item?.settings?.oauth?.credentials?.access_token;
  if (!token) {
    throw new Error(
      "GitHub connection has no access token. Open Account → Connections → GitHub in Replit and authorize it.",
    );
  }
  return token;
}

async function main() {
  const token = await getConnectorToken();
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "mentor-verify-github-connection",
  };

  const userRes = await fetch("https://api.github.com/user", { headers });
  if (!userRes.ok) {
    throw new Error(`GitHub /user returned ${userRes.status}: ${await userRes.text()}`);
  }
  const user = (await userRes.json()) as GitHubUser;
  console.log(`Authenticated as: ${user.login}`);

  const repoRes = await fetch(`https://api.github.com/repos/${REPO}`, { headers });
  if (!repoRes.ok) {
    throw new Error(
      `Cannot read ${REPO}: ${repoRes.status}. ` +
        `Make sure the connected GitHub account has access to that repo.`,
    );
  }
  const repo = (await repoRes.json()) as GitHubRepo;
  const canPush = repo.permissions?.push === true;
  console.log(`Repo: ${repo.full_name} (default branch: ${repo.default_branch})`);
  console.log(`Permissions: ${JSON.stringify(repo.permissions ?? {})}`);

  if (!canPush) {
    console.error(`Connected account ${user.login} does NOT have push permission on ${REPO}.`);
    process.exit(2);
  }

  console.log(`OK: ${user.login} has push access to ${REPO}.`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
