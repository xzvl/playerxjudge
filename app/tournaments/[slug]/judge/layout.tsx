import { TournamentConsoleShell } from "@/components/dashboard/TournamentConsoleShell";

export default async function Layout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <TournamentConsoleShell kind="judge" slug={slug}>
      {children}
    </TournamentConsoleShell>
  );
}
