"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/supabase/client";
import { Loader2 } from "lucide-react";

function redirectToLogin(
  router: ReturnType<typeof useRouter>,
  error: string,
  message: string
) {
  const params = new URLSearchParams();
  params.set("error", error);
  params.set("message", message);
  router.replace(`/auth/login?${params.toString()}`);
}

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("Authenticating...");

  useEffect(() => {
    const code = searchParams.get("code");
    const errorCode = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    if (errorCode) {
      redirectToLogin(router, errorCode, errorDescription || "OAuth login failed");
      return;
    }

    if (!code) {
      redirectToLogin(router, "missing_code", "No auth code received");
      return;
    }

    const supabase = createClient();

    (async () => {
      setStatus("Exchanging auth code...");

      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        redirectToLogin(router, "oauth_exchange_failed", exchangeError.message);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setStatus("No user session found");
        redirectToLogin(router, "no_session", "No authenticated session");
        return;
      }

      setStatus("Verifying account access...");

      const res = await fetch("/api/auth/verify-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        redirectToLogin(router, "access_denied", data.error || "Access denied");
        return;
      }

      setStatus(`Redirecting to ${data.destination}...`);
      router.replace(data.destination);
    })();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin mb-4" />
      <p className="text-muted-foreground">{status}</p>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p className="text-muted-foreground">Authenticating...</p>
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}
