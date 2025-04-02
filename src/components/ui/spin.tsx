import { LoaderCircle } from "lucide-react";
import { cn } from "~/lib/utils";

function Spin({ className, size }: { className?: string; size: number }) {
  return (
    <div className={cn("spin", className)}>
      <LoaderCircle size={size || 16} className="animate-spin" />
    </div>
  );
}

export default Spin;
