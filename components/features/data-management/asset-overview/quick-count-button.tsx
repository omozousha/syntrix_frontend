import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function QuickCountButton({ href, label, value }: { href: string; label: string; value?: number }) {
  return (
    <Button asChild variant="outline" size="sm" className="h-8 justify-between px-2 text-[11px]">
      <Link href={href}>
        <span className="truncate font-medium">{label}</span>
        {typeof value === "number" ? (
          <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px]">
            {value}
          </Badge>
        ) : (
          <Skeleton className="ml-2 h-5 w-8" />
        )}
      </Link>
    </Button>
  );
}
