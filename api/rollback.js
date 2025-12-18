import fetch from "node-fetch";

const ALLOWED_REPOS = [
  "payments-service",
  "auth-service",
  "frontend",
  "backend"
];

const ALLOWED_BRANCHES = ["main", "release"];

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed");
  }

  const { text, user_name } = req.body;

  // Expected: /rollback repo commit branch
  const [repo, commit, branch = "main"] = text.trim().split(" ");

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

  await fetch(workflowUrl, {
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

  return res.status(200).send(
    `🔄 Rollback started for *${repo}* → \`${commit}\` on *${branch}* (by @${user_name})`
  );
}
