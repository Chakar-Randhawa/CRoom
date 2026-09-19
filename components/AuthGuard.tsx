"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, initializing } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!initializing && !user) {
      router.replace("/");
    }
  }, [initializing, user, router]);

  if (initializing || !user) {
    return (
      <div className="dvh-screen flex items-center justify-center bg-paper">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-hairline border-t-pine" />
      </div>
    );
  }

  return <>{children}</>;
}
