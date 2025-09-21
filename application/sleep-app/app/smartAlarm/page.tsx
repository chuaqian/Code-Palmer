"use client";

// Redirect to canonical /smart-alarm page to avoid duplicate routes
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SmartAlarmRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/smart-alarm");
  }, [router]);
  return null;
}