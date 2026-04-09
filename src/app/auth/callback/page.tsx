"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/supabase/client";
import { Loader2 } from "lucide-react";

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("Authenticating...");

  useEffect(() => {
    const code = searchParams.get("code");
    const errorCode = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    if (errorCode) {
      const message = encodeURIComponent(errorDescription || "OAuth login failed");
      router.replace(`/auth/login?error=${errorCode}&message=${message}`);
      return;
    }

    if (!code) {
      router.replace("/auth/login?error=missing_code&message=No+auth+code+received");
      return;
    }

    const supabase = createClient();

    (async () => {
      setStatus("Exchanging auth code...");

      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        router.replace(
          `/auth/login?error=oauth_exchange_failed&message=${encodeURIComponent(exchangeError.message)}`
        );
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setStatus("No user session found");
        router.replace("/auth/login?error=no_session&message=No+authenticated+session");
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
        const message = encodeURIComponent(data.error || "Access denied");
        router.replace(`/auth/login?error=access_denied&message=${message}`);
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
