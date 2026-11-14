import React, { useRef } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useEmbedAutoHeight } from "@/hooks/useEmbedAutoHeight";

/**
 * Khung trang "thẻ" dùng chung cho các màn danh mục (đồng bộ với CatalogPage `layout="card"`, chủ dự án duyệt 2026-11-09):
 * nền xám, đường dẫn + tiêu đề trang, MỘT thẻ trắng hết bề ngang chứa nội dung (bảng). Khi nhúng trong Điều phối, báo chiều cao
 * nội dung để khung cao bằng nội dung (không có thanh cuộn riêng trong khung — xem hooks/useEmbedAutoHeight).
 */
export default function CardPage({
  trail,
  title,
  actions,
  children,
}: {
  /** các mục cha của đường dẫn, vd ["Danh mục", "Thiết bị"] */
  trail: string[];
  /** tên trang (mục cuối đường dẫn + tiêu đề) */
  title: string;
  /** nút phụ bên phải tiêu đề */
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  useEmbedAutoHeight(contentRef, 8);
  return (
    <div className="min-h-full bg-slate-100 pb-2">
      <div ref={contentRef} className="flex flex-col gap-1">
        <div className="flex flex-wrap items-end justify-between gap-2 px-3 pt-2">
          <div>
            <Breadcrumb>
              <BreadcrumbList>
                {trail.map((b) => (
                  <React.Fragment key={b}>
                    <BreadcrumbItem>
                      <BreadcrumbLink href="#">{b}</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                  </React.Fragment>
                ))}
                <BreadcrumbItem>
                  <BreadcrumbPage>{title}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <h1 className="text-xl font-bold leading-tight text-slate-800">{title}</h1>
          </div>
          {actions && <div className="flex flex-wrap items-center gap-1.5">{actions}</div>}
        </div>
        <div className="w-full border-y border-slate-300 bg-white shadow-sm">{children}</div>
      </div>
    </div>
  );
}
