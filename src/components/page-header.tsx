import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Gradient =
  | "indigo"
  | "blue"
  | "violet"
  | "amber"
  | "cyan"
  | "emerald"
  | "rose"
  | "slate";

const GRADIENTS: Record<Gradient, string> = {
  indigo: "from-indigo-500 to-violet-600 shadow-indigo-200",
  blue: "from-blue-500 to-blue-600 shadow-blue-200",
  violet: "from-violet-500 to-purple-600 shadow-violet-200",
  amber: "from-amber-500 to-orange-600 shadow-amber-200",
  cyan: "from-cyan-500 to-sky-600 shadow-cyan-200",
  emerald: "from-emerald-500 to-teal-600 shadow-emerald-200",
  rose: "from-rose-500 to-pink-600 shadow-rose-200",
  slate: "from-slate-500 to-slate-700 shadow-slate-200",
};

export function PageHeader({
  icon: Icon,
  title,
  description,
  gradient = "indigo",
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  gradient?: Gradient;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className={cn("flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-sm", GRADIENTS[gradient])}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <h1 className="font-heading text-xl font-bold tracking-tight text-gray-900">{title}</h1>
        {description && <p className="text-[13px] text-gray-400">{description}</p>}
      </div>
      {action && <div className="flex flex-shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}