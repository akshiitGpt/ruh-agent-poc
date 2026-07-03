import { cookies } from "next/headers";
import { users, orgs, getRole, orgsForUser, type Role } from "./data";

export async function getSession() {
  const jar = await cookies();
  const userId = jar.get("ruh_user")?.value ?? null;
  const orgId = jar.get("ruh_org")?.value ?? "acme";
  const user = users.find((u) => u.id === userId) ?? null;

  let org = orgs.find((o) => o.id === orgId) ?? orgs[0];
  let role: Role | null = null;
  if (user) {
    role = getRole(user.id, org.id);
    if (!role) {
      const fallback = orgsForUser(user.id)[0];
      if (fallback) {
        org = fallback;
        role = getRole(user.id, org.id);
      }
    }
  }

  return { user, org, role };
}
