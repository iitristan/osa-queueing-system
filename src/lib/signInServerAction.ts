"use server";

import { signIn } from "@/lib/auth";

export async function handleGoogleSignIn() {
  console.log("Sign in button clicked");
  await signIn("google");
}
