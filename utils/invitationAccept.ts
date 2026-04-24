/**
 * POST /invitations/token/:token/accept?raceId=...
 * Requis par le back pour finaliser l’acceptation après login.
 */
export function buildInvitationAcceptUrl(
  apiUrl: string,
  invitationToken: string,
  raceId: string
): string {
  const base = apiUrl.replace(/\/$/, "");
  const path = `${base}/invitations/token/${encodeURIComponent(invitationToken)}/accept`;
  return `${path}?raceId=${encodeURIComponent(raceId)}`;
}

export async function postAcceptInvitation(
  apiUrl: string,
  jwt: string,
  invitationToken: string,
  raceId: string
): Promise<Response> {
  const url = buildInvitationAcceptUrl(apiUrl, invitationToken, raceId);
  const authHeader = jwt.startsWith("Bearer ") ? jwt : `Bearer ${jwt}`;
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
    },
  });
}
