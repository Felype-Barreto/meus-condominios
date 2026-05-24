import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    token?: string;
    fallback?: string;
  };
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    return NextResponse.json({
      success: String(body.fallback ?? "").trim().toUpperCase() === "CONDOMINIO",
    });
  }

  if (!body.token) {
    return NextResponse.json({ success: false }, { status: 400 });
  }

  const formData = new FormData();
  formData.append("secret", secret);
  formData.append("response", body.token);

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: formData,
  });
  const result = (await response.json().catch(() => ({}))) as { success?: boolean };

  return NextResponse.json({ success: result.success === true });
}
