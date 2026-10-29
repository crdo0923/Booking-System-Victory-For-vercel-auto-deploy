import { NextResponse } from "next/server";
import { getAuthProvider } from "@/lib/auth/provider";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email.trim() : "";

    if (!email) {
      return NextResponse.json({ ok: false, error: "Email is required" }, { status: 400 });
    }

    const provider = await getAuthProvider();
    const { DEMO_PASSWORD } = await import("@/lib/demo/seed");
    const result = await provider.signIn(email, DEMO_PASSWORD);

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 401 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const error = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ ok: false, error }, { status: 500 });
  }
}
