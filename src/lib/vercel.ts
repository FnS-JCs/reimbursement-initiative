const VERCEL_API_BASE = "https://api.vercel.com";

async function vercelFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = process.env.VERCEL_API_TOKEN;
  if (!token) {
    throw new Error("VERCEL_API_TOKEN is not configured");
  }

  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamSlug = process.env.VERCEL_TEAM_SLUG;
  if (!projectId) {
    throw new Error("VERCEL_PROJECT_ID is not configured");
  }

  const separator = path.includes("?") ? "&" : "?";
  const teamParam = teamSlug ? `${separator}slug=${encodeURIComponent(teamSlug)}` : "";

  return fetch(`${VERCEL_API_BASE}${path}${teamParam}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

export type AutoUpdateResult =
  | { ok: true; updated: boolean; redeployed: boolean }
  | { ok: false; error: string };

export async function updateVercelEnvVar(key: string, value: string): Promise<AutoUpdateResult> {
  const projectId = process.env.VERCEL_PROJECT_ID;

  try {
    const response = await vercelFetch(`/v10/projects/${projectId}/env?upsert=true`, {
      method: "POST",
      body: JSON.stringify({
        key,
        value,
        type: "sensitive",
        target: ["production"],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      return {
        ok: false,
        error: `Vercel env update failed (${response.status}): ${body}`,
      };
    }

    return { ok: true, updated: true, redeployed: false };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}

export async function triggerRedeploy(): Promise<boolean> {
  const hookUrl = process.env.VERCEL_DEPLOY_HOOK_URL;
  if (!hookUrl) return false;

  try {
    const response = await fetch(hookUrl, { method: "POST" });
    return response.ok;
  } catch (error: unknown) {
    console.error("Failed to trigger redeploy:", error);
    return false;
  }
}

export async function autoUpdateDriveToken(refreshToken: string): Promise<AutoUpdateResult> {
  if (!process.env.VERCEL_API_TOKEN || !process.env.VERCEL_PROJECT_ID) {
    return { ok: false, error: "Vercel auto-update is not configured" };
  }

  const updateResult = await updateVercelEnvVar("GOOGLE_DRIVE_REFRESH_TOKEN", refreshToken);
  if (!updateResult.ok) {
    return updateResult;
  }

  const redeployed = await triggerRedeploy();
  return { ok: true, updated: true, redeployed };
}