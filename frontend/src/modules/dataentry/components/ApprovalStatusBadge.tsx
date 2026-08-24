import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Check, Clock, AlertTriangle } from "lucide-react";
import type { ApprovalStatus } from "@/modules/dataentry/types/thong-ke";

interface ApprovalStatusBadgeProps {
  status?: ApprovalStatus;
  note?: string;
  className?: string;
}

export const ApprovalStatusBadge: React.FC<ApprovalStatusBadgeProps> = ({
  status = "PENDING",
  note,
  className = "",
}) => {
  if (status === "APPROVED") {
    return (
      <Badge
        variant="outline"
        className={`bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800 gap-1 text-xs font-semibold px-2 py-0.5 whitespace-nowrap shadow-none ${className}`}
      >
        <Check className="w-3 h-3 stroke-[2.5]" />
        <span>Đã duyệt</span>
      </Badge>
    );
  }

  if (status === "REVISION_REQUESTED") {
    const badgeElement = (
      <Badge
        variant="outline"
        className={`bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800 gap-1 text-xs font-semibold px-2 py-0.5 whitespace-nowrap animate-pulse shadow-none cursor-pointer ${className}`}
      >
        <AlertTriangle className="w-3 h-3 stroke-[2.5]" />
        <span>Cần sửa</span>
      </Badge>
    );

    if (note) {
      return (
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>{badgeElement}</TooltipTrigger>
            <TooltipContent
              side="top"
              className="bg-gray-900 text-white text-xs max-w-xs p-2 rounded-md shadow-lg"
            >
              <p className="font-bold text-rose-300 mb-0.5">Yêu cầu sửa đổi:</p>
              <p>{note}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return badgeElement;
  }

  // Mặc định PENDING (Chờ duyệt)
  return (
    <Badge
      variant="outline"
      className={`bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800 gap-1 text-xs font-semibold px-2 py-0.5 whitespace-nowrap shadow-none ${className}`}
    >
      <Clock className="w-3 h-3" />
      <span>Chờ duyệt</span>
    </Badge>
  );
};
