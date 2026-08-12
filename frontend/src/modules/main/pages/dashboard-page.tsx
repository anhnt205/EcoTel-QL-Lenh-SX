import { NumberTicker } from "@/components/ui/number-ticker";
import {
  BarChart3,
  Truck,
  Fuel,
  ShieldCheck,
  ArrowUpRight,
  Clock,
  FileCheck,
  ChevronRight,
  Plus,
} from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/constants/routes";

export function DashboardPage() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-[1400px] p-6 lg:p-8 space-y-8">
      {/* Header & Breadcrumb */}
      <div className="space-y-3">
        <Breadcrumb>
          <BreadcrumbList className="text-xs text-muted-foreground">
            <BreadcrumbItem>
              <BreadcrumbLink
                href="#"
                className="hover:text-foreground transition-colors"
              >
                Trang chủ
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="font-semibold text-foreground">
                Tổng quan Dashboard
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
              Hệ Thống Thống Kê & Báo Cáo Khai Thác Mỏ
            </h1>
            <p className="text-xs lg:text-sm text-muted-foreground mt-1">
              Tổng quan tình hình sản lượng vận tải, nhiên liệu và đối chiếu ca
              trực trong ngày
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              onClick={() => navigate(ROUTES.STATISTICS.INTERNAL_TRUCKS)}
              className="rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2.5 text-sm font-medium shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Thống kê Xe trong mỏ
            </Button>
            <Button
              onClick={() => navigate(ROUTES.STATISTICS.EXTERNAL_TRUCKS)}
              variant="outline"
              className="rounded-lg border border-input bg-background hover:bg-accent text-foreground px-4 py-2.5 text-sm font-medium shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Thống kê Xe thuê ngoài
            </Button>
          </div>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="rounded-xl border border-border bg-card p-5 shadow-xs hover:border-blue-500/40 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tổng sản lượng hôm nay
            </span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <BarChart3 className="size-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-1.5">
              <NumberTicker value={1240} variant="gradient" className="text-3xl font-extrabold" />
              <span className="text-xs font-medium text-muted-foreground">Chuyến</span>
            </div>
            <p className="text-xs font-medium text-blue-600 dark:text-blue-400 flex items-center mt-2">
              <ArrowUpRight className="h-3.5 w-3.5 mr-0.5 shrink-0" />
              <NumberTicker value={37200} variant="blue" className="font-bold text-xs" />
              <span className="ml-1">Tấn quy đổi</span>
            </p>
          </div>
        </Card>

        <Card className="rounded-xl border border-border bg-card p-5 shadow-xs hover:border-blue-500/40 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Xe hoạt động ca này
            </span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Truck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-1.5">
              <NumberTicker value={38} variant="blue" className="text-3xl font-extrabold" />
              <span className="text-xl font-bold text-muted-foreground">/ 42</span>
              <span className="text-xs font-medium text-muted-foreground">Xe</span>
            </div>
            <p className="text-xs font-medium text-muted-foreground mt-2">
              30 Xe mỏ • 8 Xe thuê ngoài
            </p>
          </div>
        </Card>

        <Card className="rounded-xl border border-border bg-card p-5 shadow-xs hover:border-amber-500/40 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Nhiên liệu tiêu thụ
            </span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Fuel className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-1.5">
              <NumberTicker value={4850} variant="amber" className="text-3xl font-extrabold" />
              <span className="text-xs font-medium text-muted-foreground">Lít</span>
            </div>
            <p className="text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center mt-2">
              Định mức 5,000 Lít (Đạt 97%)
            </p>
          </div>
        </Card>

        <Card className="rounded-xl border border-border bg-card p-5 shadow-xs hover:border-blue-500/40 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tỷ lệ đối chiếu khớp
            </span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-1.5">
              <NumberTicker value={98.2} decimalPlaces={1} suffix="%" variant="blue" className="text-3xl font-extrabold" />
            </div>
            <p className="text-xs font-medium text-muted-foreground mt-2">
              Chỉ 2 phiếu có sai lệch nhẹ
            </p>
          </div>
        </Card>
      </div>

      {/* Quick Action & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="rounded-xl border border-border bg-card p-6 shadow-xs lg:col-span-2 space-y-5">
          <div className="flex items-center justify-between border-b border-border/60 pb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-base font-bold text-card-foreground tracking-tight">
                Nhật ký phiếu nhập gần đây
              </h2>
            </div>
            <Button
              variant="ghost"
              onClick={() => navigate(ROUTES.STATISTICS.INTERNAL_TRUCKS)}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground p-0 h-auto cursor-pointer flex items-center gap-1"
            >
              Xem tất cả <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="space-y-2.5">
            {[
              {
                code: "XE-01",
                shift: "Ca 1",
                date: "2026-07-23",
                trips: "12 chuyến",
                weight: "360 Tấn",
                status: "Đã lưu",
                isApproved: true,
              },
              {
                code: "XE-05",
                shift: "Ca 1",
                date: "2026-07-23",
                trips: "15 chuyến",
                weight: "450 Tấn",
                status: "Đã lưu",
                isApproved: true,
              },
              {
                code: "XE-08",
                shift: "Ca 2",
                date: "2026-07-23",
                trips: "10 chuyến",
                weight: "300 Tấn",
                status: "Chờ duyệt",
                isApproved: false,
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3.5 rounded-lg border border-border/60 bg-muted/30 hover:bg-muted/60 transition-colors"
              >
                <div className="flex items-center gap-3.5">
                  <div className="px-2.5 py-1 rounded-md bg-card border border-border font-mono text-xs font-bold text-card-foreground shadow-2xs">
                    {item.code}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-card-foreground leading-tight">
                      {item.shift} • {item.date}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.trips} —{" "}
                      <span className="font-medium text-foreground">
                        {item.weight}
                      </span>
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={`rounded-md px-2.5 py-0.5 text-xs font-semibold border ${
                    item.isApproved
                      ? "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200/80 dark:border-blue-800/50"
                      : "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200/80 dark:border-amber-800/50"
                  }`}
                >
                  {item.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Shortcuts */}
        <Card className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-5">
          <div className="border-b border-border/60 pb-4">
            <div className="flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-base font-bold text-card-foreground tracking-tight">
                Phím tắt & Báo cáo nhanh
              </h2>
            </div>
          </div>

          <div className="space-y-2.5">
            {[
              {
                label: "Đối chiếu Sản lượng trạm cân",
                route: ROUTES.RECONCILIATION.PRODUCTION,
              },
              {
                label: "Đối chiếu Nhiên liệu Gas",
                route: ROUTES.RECONCILIATION.FUEL,
              },
            ].map((shortcut, idx) => (
              <Button
                key={idx}
                variant="outline"
                onClick={() => navigate(shortcut.route)}
                className="w-full flex items-center justify-between p-3.5 rounded-lg border border-border bg-card hover:bg-accent hover:border-border transition-all text-sm font-medium text-card-foreground shadow-2xs group text-left cursor-pointer h-auto"
              >
                <span>{shortcut.label}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
              </Button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
