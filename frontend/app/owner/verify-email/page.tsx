"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { api } from "../../../lib/api";
import { useOwnerAuth } from "../../components/OwnerAuthProvider";
import AuthBackdrop from "../../components/AuthBackdrop";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { login } = useOwnerAuth();
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError("This verification link is missing its token.");
      return;
    }
    api
      .post<{ access_token: string }>("/owner/verify-email", { token })
      .then((res) => {
        login(res.access_token);
        setStatus("done");
      })
      .catch((err: unknown) => {
        setError((err as Error).message ?? "This verification link is invalid or has expired.");
        setStatus("error");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (status === "loading") {
    return <Loader2 size={24} className="animate-spin my-10" style={{ color: "var(--brand)" }} />;
  }

  if (status === "error") {
    return (
      <>
        <div
          className="flex h-14 w-14 items-center justify-center rounded-2xl mb-6"
          style={{ background: "var(--danger-light)" }}
        >
          <XCircle size={26} style={{ color: "var(--danger)" }} />
        </div>
        <h1 className="text-2xl font-bold mb-1 text-center" style={{ color: "var(--text)" }}>
          Verification failed
        </h1>
        <p className="text-sm text-center mb-7" style={{ color: "var(--text-2)" }}>
          {error}
        </p>
        <a
          href="/owner/login"
          className="w-full rounded-xl font-semibold text-base text-white flex items-center justify-center"
          style={{ background: "var(--brand)", height: 52 }}
        >
          Back to sign in
        </a>
      </>
    );
  }

  return (
    <>
      <div
        className="flex h-14 w-14 items-center justify-center rounded-2xl mb-6"
        style={{ background: "var(--brand-light)" }}
      >
        <CheckCircle2 size={26} style={{ color: "var(--brand)" }} />
      </div>
      <h1 className="text-2xl font-bold mb-1 text-center" style={{ color: "var(--text)" }}>
        Email verified
      </h1>
      <p className="text-sm text-center" style={{ color: "var(--text-2)" }}>
        Taking you to your dashboard&hellip;
      </p>
    </>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center px-6 py-12">
      <AuthBackdrop variant="owner" />
      <div
        className="relative z-10 w-full max-w-xs rounded-3xl p-7 flex flex-col items-center"
        style={{ background: "var(--surface)", boxShadow: "var(--shadow-lg)", border: "1.5px solid var(--border)" }}
      >
        <Suspense fallback={<Loader2 size={24} className="animate-spin my-10" style={{ color: "var(--brand)" }} />}>
          <VerifyEmailContent />
        </Suspense>
      </div>
    </div>
  );
}
