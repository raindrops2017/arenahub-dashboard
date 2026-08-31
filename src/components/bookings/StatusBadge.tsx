import { getStatusBadgeClass } from "../../utils/booking";

export function StatusBadge({ status, className = "" }: { status: string; className?: string }) {
  return (
    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${getStatusBadgeClass(status)} ${className}`}>
      {status}
    </span>
  );
}
