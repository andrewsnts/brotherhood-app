"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";

/**
 * Invisible component that writes the logged-in member's ID into
 * localStorage whenever the session changes, so every page that reads
 * bh_last_member automatically defaults to the right person.
 */
export function SessionSync() {
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.user?.memberId) {
      localStorage.setItem("bh_last_member", session.user.memberId);
    }
  }, [session?.user?.memberId]);

  return null;
}
