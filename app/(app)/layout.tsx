import { ProtectedLayoutClient } from "@/components/protected-layout-client";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedLayoutClient>{children}</ProtectedLayoutClient>;
}
