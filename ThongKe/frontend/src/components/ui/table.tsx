import * as React from "react";

import { cn } from "@/utils/cn";

function Table({
  className,
  containerClassName,
  containerStyle,
  ...props
}: React.ComponentProps<"table"> & {
  containerClassName?: string;
  containerStyle?: React.CSSProperties;
}) {
  return (
    <div
      data-slot="table-container"
      className={cn(
        "relative w-full overflow-x-auto rounded-xl border border-zinc-200/80 bg-white shadow-2xs",
        containerClassName,
      )}
      style={containerStyle}
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
        "[&_tr:last-child]:border-0 divide-y divide-zinc-100",
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
        "border-b border-zinc-100/80 transition-colors hover:bg-zinc-50/80 has-aria-expanded:bg-zinc-50/80 data-[state=selected]:bg-amber-50/50",
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
        "h-11 px-4 py-3 text-left align-middle text-sm font-bold tracking-wider text-slate-800 dark:text-slate-100 whitespace-nowrap [&:has([role=checkbox])]:pr-0",
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
        "px-4 py-3.5 align-middle text-sm text-zinc-700 whitespace-nowrap [&:has([role=checkbox])]:pr-0",
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
