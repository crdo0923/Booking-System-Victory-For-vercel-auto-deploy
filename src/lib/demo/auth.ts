import "server-only";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { AuthProvider } from "@/lib/auth/provider";
import { getDemoSessionSecret, getDemoState } from "@/lib/demo/store";
import { hashDemoPassword, verifyDemoPassword } from "@/lib/demo/passwords";
import { DEMO_SESSION_COOKIE } from "@/lib/auth/constants";

function sign(userId: string): string {
  const mac = createHmac("sha256", getDemoSessionSecret()).update(userId).digest("base64url");
  return `${userId}.${mac}`;
}

function verify(token: string | undefined): string | null {
  if (!token) return null;
  const [userId, mac] = token.split(".");
  if (!userId || !mac) return null;
  const expected = Buffer.from(sign(userId).split(".")[1]);
  const actual = Buffer.from(mac);
  return expected.length === actual.length && timingSafeEqual(expected, actual) ? userId : null;
}

async function setSession(userId: string) {
  const store = await cookies();
  store.set(DEMO_SESSION_COOKIE, sign(userId), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

/** Development-only auth. Sessions are HMAC-signed server-side and reset when the dev server restarts. */
export function createDemoAuthProvider(): AuthProvider {
  const state = getDemoState();

  return {
    async getCurrentUser() {
      const store = await cookies();
      const userId = verify(store.get(DEMO_SESSION_COOKIE)?.value);
      const user = userId ? state.users.find((u) => u.id === userId) : undefined;
      return user
        ? {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            phone: user.phone,
            role: user.role,
            systemRole: user.systemRole,
            accessStatus: user.accessStatus,
            accessReason: user.accessReason,
          }
        : null;
    },

    async signIn(email, password) {
      let user = state.users.find((u) => u.email === email);
      if (!user) {
        // Auto-provision demo account if matching known DEMO_ACCOUNTS
        const { DEMO_ACCOUNTS, DEMO_PASSWORD } = await import("@/lib/demo/seed");
        const account = Object.values(DEMO_ACCOUNTS).find((acc) => acc.email === email);
        if (account) {
          const nowIso = new Date().toISOString();
          const newUser: typeof state.users[number] = {
            id: randomUUID(),
            email: account.email,
            fullName: account.fullName,
            phone: "+639170000099",
            role: account.role as "admin" | "user",
            systemRole: account.systemRole,
            accessStatus: account.systemRole === "guest" ? "pending" : "active",
            accessReason: null,
            accessReviewedAt: account.systemRole === "guest" ? null : nowIso,
            accessNotificationError: null,
            ghlContactId: null,
            passwordHash: hashDemoPassword(DEMO_PASSWORD),
            createdAt: nowIso,
          };
          state.users.push(newUser);
          if (newUser.accessStatus === "active") {
            state.googleConnections.add(newUser.id);
          }
          user = newUser;
        }
      }
      if (!user || !verifyDemoPassword(password, user.passwordHash)) {
        return { ok: false, error: "Incorrect email or password." };
      }
      await setSession(user.id);
      return { ok: true };
    },

    async signUp({ fullName, email, phone, password }) {
      if (state.users.some((u) => u.email === email)) {
        return { ok: false, error: "An account with this email already exists. Sign in instead." };
      }
      const id = randomUUID();
      state.users.push({
        id,
        email,
        fullName,
        phone,
        role: "user",
        accessStatus: "pending",
        accessReason: null,
        accessReviewedAt: null,
        accessNotificationError: null,
        ghlContactId: null,
        passwordHash: hashDemoPassword(password),
        createdAt: new Date().toISOString(),
      });
      await setSession(id);
      return { ok: true, needsConfirmation: false, userId: id };
    },

    async signOut() {
      const store = await cookies();
      store.delete(DEMO_SESSION_COOKIE);
    },

    async changePassword(currentPassword, newPassword) {
      const store = await cookies();
      const userId = verify(store.get(DEMO_SESSION_COOKIE)?.value);
      const user = userId ? state.users.find((u) => u.id === userId) : undefined;
      if (!user) return { ok: false, error: "Your session has expired. Sign in again." };
      if (!verifyDemoPassword(currentPassword, user.passwordHash)) return { ok: false, error: "Your current password is incorrect." };
      user.passwordHash = hashDemoPassword(newPassword);
      return { ok: true };
    },

    async sendPasswordReset() {
      return { ok: true, message: "Demo mode does not send emails. Use the demo password to sign in." };
    },

    async resetPassword() {
      return { ok: false, error: "Password reset links aren't available in demo mode." };
    },
  };
}
