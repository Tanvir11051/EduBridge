import type { ReactNode } from "react";
import { Navbar } from "@/components/layout/navbar";
import { ChatWidget } from "@/components/layout/chat-widget";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
      <ChatWidget />
    </div>
  );
}
