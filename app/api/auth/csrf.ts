import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import crypto from "crypto"

export async function GET() {
  // Generate a random token
  const csrfToken = crypto.randomBytes(32).toString("hex")

  // Set the token in a cookie
  cookies().set({
    name: "csrf_token",
    value: csrfToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60, // 1 hour
  })

  // Return the token to the client
  return NextResponse.json({ csrfToken })
}
