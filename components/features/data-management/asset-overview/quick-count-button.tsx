import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function QuickCountButton({ href, label, value }: { href: string; label: string; value?: number }) {
  return (
    <Button asChild variant="ghost" size="sm" className="h-9 justify-between gap-2 rounded-xl border border-border/60 bg-muted/10 px-2.5 text-xs transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-primary/45 hover:bg-muted/20 active:scale-[0.98] glass-inset">
      <Link href={href}>
        <span className="min-w-0 truncate font-medium">{label}</span>
        {typeof value === "number" ? (
          <Badge variant="secondary" className="h-5 shrink-0 rounded-full px-1.5 font-mono text-[9px] tabular-nums uppercase tracking-[0.1em]">
            {value}
          </Badge>
        ) : (
          <Skeleton className="h-5 w-8 shrink-0" />
        )}
      </Link>
    </Button>
  );
}
