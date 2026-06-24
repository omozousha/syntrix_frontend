import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function QuickCountButton({ href, label, value }: { href: string; label: string; value?: number }) {
  return (
    <Button asChild variant="outline" size="sm" className="h-9 justify-between gap-2 px-2.5 text-xs">
      <Link href={href}>
        <span className="min-w-0 truncate font-medium">{label}</span>
        {typeof value === "number" ? (
          <Badge variant="secondary" className="h-5 shrink-0 px-1.5 text-[10px]">
            {value}
          </Badge>
        ) : (
          <Skeleton className="h-5 w-8 shrink-0" />
        )}
      </Link>
    </Button>
  );
}
