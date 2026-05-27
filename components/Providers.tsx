"use client";

import { LocaleProvider } from "@/components/LocaleProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return <LocaleProvider>{children}</LocaleProvider>;
}
