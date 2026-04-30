"use client";

import { signIn } from "next-auth/react";

export default function LoginButton() {
  return (
    <button
      className="btn btn-primary"
      onClick={() => signIn("google", { callbackUrl: "/" })}
    >
      使用 Google 帳號登入
    </button>
  );
}
