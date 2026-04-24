import { useEffect, useState } from "react";
import { useAuth } from "../context/auth";

// Hook: returns whether the current user has premium. Safe to call from components.
export function usePremiumStatus(): boolean {
  const { user, token, refreshUserData } = useAuth();
  const [isPremium, setIsPremium] = useState<boolean>(
    !!(user as any)?.isPremium
  );

  const API_URL = process.env.EXPO_PUBLIC_API_URL || "";

  useEffect(() => {
    // Prefer value from `user` if available so UI updates immediately.
    if (user && typeof (user as any).isPremium !== "undefined") {
      setIsPremium(!!(user as any).isPremium);
      return;
    }

    let mounted = true;
    const checkPremiumStatus = async () => {
      if (!token || !API_URL) return;
      try {
        const authHeader = token.startsWith("Bearer ")
          ? token
          : `Bearer ${token}`;
        const response = await fetch(`${API_URL}/users/profile`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
          },
        });

        if (!mounted) return;
        if (response.ok) {
          const data = await response.json();
          setIsPremium(!!data.isPremium);
          if (refreshUserData) {
            try {
              await refreshUserData();
            } catch {}
          }
        }
      } catch (error) {
        // noop
      }
    };

    checkPremiumStatus();
    return () => {
      mounted = false;
    };
    // include refreshUserData so hook re-checks if that function changes
  }, [user, token, API_URL, refreshUserData]);

  return isPremium;
}
