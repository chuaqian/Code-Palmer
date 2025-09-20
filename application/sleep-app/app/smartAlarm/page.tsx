// Redirect to canonical /smart-alarm page to avoid duplicate routes
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SmartAlarmRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/smart-alarm");
  }, [router]);
  return null;
}
