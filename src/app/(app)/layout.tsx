import { AppLayoutClient } from "@/components/layout/app-layout-client";
import { UpgradeModalProvider } from "@/components/upgrade-modal";
import { auth } from "@clerk/nextjs/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  return (
    <UpgradeModalProvider>
      <AppLayoutClient>{children}</AppLayoutClient>
    </UpgradeModalProvider>
  );
}
