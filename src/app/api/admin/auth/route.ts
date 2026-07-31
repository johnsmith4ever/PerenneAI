import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const PASSWORDS = {
  0: "613124",
  1: "abcdjohnsmith01",
  2: "Kyrus2013!",
  3: "johnsmith4ever",
};

export async function POST(req: Request) {
  try {
    const { level, code } = await req.json();

    if (level === undefined || !code) {
      return NextResponse.json({ status: "error", message: "Missing level or code" }, { status: 400 });
    }

    const expectedCode = PASSWORDS[level as keyof typeof PASSWORDS];

    if (code !== expectedCode) {
      return NextResponse.json({ status: "error", message: "Invalid credentials" }, { status: 401 });
    }

    // If this is the final level (3), grant the secure admin token
    if (level === 3) {
      const cookieStore = await cookies();
      cookieStore.set({
        name: "admin_token",
        value: "granted_access_token_secure",
        httpOnly: true,
        path: "/",
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24, // 24 hours
      });
    }

    return NextResponse.json({ status: "success", message: "Level cleared" });
  } catch (error: any) {
    return NextResponse.json({ status: "error", message: "Internal Server Error" }, { status: 500 });
  }
}
