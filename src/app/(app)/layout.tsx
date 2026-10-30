import type { Metadata } from "next";
import { AppLayoutClient } from "@/components/layout/app-layout-client";
import { UpgradeModalProvider } from "@/components/upgrade-modal";
import { auth } from "@clerk/nextjs/server";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  return (
    <UpgradeModalProvider>
      <AppLayoutClient>
        {children}
      </AppLayoutClient>
    </UpgradeModalProvider>
  );
}
