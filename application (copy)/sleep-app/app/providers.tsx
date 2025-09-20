"use client";

import { HeroUIProvider } from "@heroui/react";

export default function UIProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return <HeroUIProvider>{children}</HeroUIProvider>;
}
