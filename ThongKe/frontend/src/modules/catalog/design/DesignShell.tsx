import React, { useRef } from "react";
import "@/styles/catalog-design.css";
import { useEmbedAutoHeight } from "@/hooks/useEmbedAutoHeight";
import DIcon from "./DIcon";

/**
 * Khung trang THEO THIẾT KẾ (đường dẫn, thẻ trắng, tiêu đề + mô tả + nhóm nút) cho các màn có nội dung riêng
 * (báo cáo/lưới/biểu mẫu) không dùng bảng danh mục chuẩn. Tự báo chiều cao cho khung nhúng.
 */
export default function DesignShell({
  trail,
  title,
  description,
  actions,
  children,
}: {
  trail: string[];
  title: string;
  description?: string;
  /** nhóm nút bên phải tiêu đề — dùng class `btn` / `btn btn-primary` của thiết kế */
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  useEmbedAutoHeight(contentRef, 40);
  return (
    <div className="tkc">
      <div ref={contentRef}>
        <div className="breadcrumbs">
          <DIcon name="home" />
          {trail.map((b) => (
            <React.Fragment key={b}>
              <span>{b}</span>
              <DIcon name="chevron-right" className="crumb-chev" />
            </React.Fragment>
          ))}
          <strong>{title}</strong>
        </div>
        <section className="panel" style={{ paddingBottom: 14 }}>
          <div className="panel-top">
            <div className="heading">
              <span className="heading-icon">
                <DIcon name="boxes" />
              </span>
              <div>
                <h1>{title}</h1>
                {description && <p>{description}</p>}
              </div>
            </div>
            {actions && <div className="button-group">{actions}</div>}
          </div>
          {children}
        </section>
      </div>
    </div>
  );
}
