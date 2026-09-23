import { STATUS_LABEL } from "@/lib/format";
import type { Status } from "@/lib/types";
export function StatusChip({ status, live }: { status: Status | "PENDING"; live?: boolean }) {
  return (
    <span className={`chip chip-${status}`}>
      {(status === "IN_PROGRESS" || live) && <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-current" aria-hidden />}
      {STATUS_LABEL[status]}
    </span>
  );
}
