import * as React from "react";

import { cn } from "@/utils/cn";

/** Số dòng hiển thị tối đa không cuộn; nhiều hơn thì khung giữ chiều cao 15 dòng và cuộn dọc (tiêu đề đứng yên). */
const VISIBLE_ROWS = 15;

function Table({
  className,
  containerClassName,
  containerStyle,
  ...props
}: React.ComponentProps<"table"> & {
  containerClassName?: string;
  containerStyle?: React.CSSProperties;
}) {
  const boxRef = React.useRef<HTMLDivElement>(null);
  const [cap, setCap] = React.useState<number | undefined>(undefined);
  const hasOwnMax = containerStyle?.maxHeight != null;

  // Đo tiêu đề + 15 dòng đầu thực tế (độ cao dòng khác nhau theo từng bảng) → đặt max-height cho khung; ≤15 dòng thì không giới hạn.
  React.useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box || hasOwnMax) return;
    const measure = () => {
      // bảng "chảy theo trang" (overflow visible) hoặc khung tự co giãn theo màn hình (flex-1, toàn màn hình) thì không giới hạn
      if (getComputedStyle(box).overflowX === "visible" || box.classList.contains("flex-1")) return setCap((c) => (c === undefined ? c : undefined));
      const rows = box.querySelectorAll<HTMLElement>(":scope > table > tbody > tr");
      if (rows.length <= VISIBLE_ROWS) return setCap((c) => (c === undefined ? c : undefined));
      const head = box.querySelector<HTMLElement>(":scope > table > thead");
      let h = head?.offsetHeight ?? 0;
      for (let i = 0; i < VISIBLE_ROWS; i++) h += rows[i].offsetHeight;
      const next = h + 14; // chỗ cho thanh cuộn ngang + viền
      setCap((c) => (c === next ? c : next));
    };
    measure();
    const tbl = box.querySelector("table");
    const ro = tbl ? new ResizeObserver(measure) : undefined;
    if (tbl) ro?.observe(tbl);
    return () => ro?.disconnect();
  }, [hasOwnMax]);

  return (
    <div
      ref={boxRef}
      data-slot="table-container"
      data-capped={cap !== undefined ? "true" : undefined}
      className={cn(
        "relative w-full overflow-x-auto rounded-xl border border-[#8fa9cc] bg-white shadow-2xs",
        containerClassName,
      )}
      style={cap !== undefined ? { ...containerStyle, maxHeight: cap, overflowY: "auto" } : containerStyle}
    >
      <table
        data-slot="table"
        className={cn(
          "w-full caption-bottom text-sm border-collapse",
          className,
        )}
        {...props}
      />
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn(
        " text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 [&_tr]:border-b-0",
        className,
      )}
      {...props}
    />
  );
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn(
        "[&_tr:last-child]:border-0 divide-y divide-[#b4c8e2]",
        className,
      )}
      {...props}
    />
  );
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t border-zinc-200/80 bg-zinc-50/50 font-medium text-zinc-600 [&>tr]:last:border-b-0",
        className,
      )}
      {...props}
    />
  );
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b border-[#b4c8e2] transition-colors hover:bg-zinc-50/80 has-aria-expanded:bg-zinc-50/80 data-[state=selected]:bg-amber-50/50",
        className,
      )}
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-11 px-4 py-3 text-left align-middle text-sm font-bold tracking-wider text-slate-800 dark:text-slate-100 whitespace-nowrap border-r border-black/30 last:border-r-0 [&:has([role=checkbox])]:pr-0",
        className,
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "px-4 py-3.5 align-middle text-sm text-zinc-700 whitespace-nowrap border-r border-[#b4c8e2] last:border-r-0 [&:has([role=checkbox])]:pr-0",
        className,
      )}
      {...props}
    />
  );
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-zinc-500", className)}
      {...props}
    />
  );
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};
