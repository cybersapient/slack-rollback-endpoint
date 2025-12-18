import fetch from "node-fetch";

const ALLOWED_REPOS = [
  "payments-service",
  "auth-service",
  "frontend",
  "backend"
];

const ALLOWED_BRANCHES = ["main", "release"];

export default async function handler(req, res) {
  // Health check (browser / uptime monitors)
  if (req.method === "GET") {
    return res.status(200).send("✅ Rollback endpoint is alive");
  }

  // Only allow Slack POST requests
  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed");
  }

  // Slack sends form-encoded data
  const { text, user_name } = req.body || {};

  if (!text) {
    return res.status(400).send(
      "Missing command text. Usage: /rollback <repo> <commit> [branch]"
    );
  }

  // Expected format: /rollback repo commit branch
  const [repo, commit, branch = "main"] = text.trim().split(/\s+/);

  if (!repo || !commit) {
    return res.status(400).send(
      "Usage: /rollback <repo> <commit> [branch]"
    );
  }

  if (!ALLOWED_REPOS.includes(repo)) {
    return res.status(403).send("❌ Repo not allowed");
  }

  if (!ALLOWED_BRANCHES.includes(branch)) {
    return res.status(403).send("❌ Branch not allowed");
  }

  const workflowUrl =
    `https://api.github.com/repos/cybersapient/${repo}/actions/workflows/rollback.yml/dispatches`;

  try {
    const response = await fetch(workflowUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GITHUB_TOKEN}`,
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ref: branch,
        inputs: { commit, branch }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(errorText);
      return res.status(500).send("❌ Failed to trigger rollback workflow");
    }

    return res.status(200).send(
      `🔄 Rollback started for *${repo}* → \`${commit}\` on *${branch}* (by @${user_name})`
    );
  } catch (err) {
    console.error(err);
    return res.status(500).send("❌ Internal server error");
  }
}
