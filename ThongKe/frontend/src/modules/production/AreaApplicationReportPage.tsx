import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import "@/styles/catalog-design.css";
import api from "@/config/api.config";
import DesignShell from "../catalog/design/DesignShell";
import DIcon from "../catalog/design/DIcon";
import ViewGrid, { type ViewColumn } from "../catalog/design/ViewGrid";
import { productionService, type AreaApplicationRow } from "./productionService";

interface NamedOption {
  id: number;
  code: string;
  name: string;
}

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

const fmt = (v: number | null | undefined, digits = 3): string => {
  if (v == null) return "—";
  return v.toLocaleString("vi-VN", { maximumFractionDigits: digits });
};

/**
 * Gộp theo SẢN PHẨM (Đất CN / Đất SX / Than SX) — mỗi sản phẩm một khối 9 cột liền nhau
 * (Tổng m3/tấn/tkm, Số TĐ m3/tấn/tkm, HS m3/tấn/tkm), dưới MỘT tiêu đề nhóm.
 * Bảng dùng chung `ViewGrid` như các bảng danh mục khác (tiêu đề xanh, sắp xếp + lọc từng cột,
 * Hiển thị cột, chỉnh bảng).
 */
const METRICS: { id: string; label: string; field: (g: ProductGroup) => keyof AreaApplicationRow }[] = [
  { id: "totalM3", label: "Tổng m3", field: (g) => g.totalM3 },
  { id: "totalTon", label: "Tổng KLVC (tấn)", field: (g) => g.totalTon },
  { id: "totalTkm", label: "Tổng tkm", field: (g) => g.totalTkm },
  { id: "surveyM3", label: "Số TĐ (m3)", field: (g) => g.surveyM3 },
  { id: "surveyTon", label: "Số TĐ (tấn)", field: (g) => g.surveyTon },
  { id: "surveyTkm", label: "Số TĐ (tkm)", field: (g) => g.surveyTkm },
  { id: "hsM3", label: "HS (m3)", field: (g) => g.hsM3 },
  { id: "hsTon", label: "HS (tấn)", field: (g) => g.hsTon },
  { id: "hsTkm", label: "HS (tkm)", field: (g) => g.hsTkm },
];

interface ProductGroup {
  key: "cn" | "sx" | "coal";
  label: string;
  totalM3: keyof AreaApplicationRow;
  totalTon: keyof AreaApplicationRow;
  totalTkm: keyof AreaApplicationRow;
  surveyM3: keyof AreaApplicationRow;
  surveyTon: keyof AreaApplicationRow;
  surveyTkm: keyof AreaApplicationRow;
  hsM3: keyof AreaApplicationRow;
  hsTon: keyof AreaApplicationRow;
  hsTkm: keyof AreaApplicationRow;
}

const PRODUCT_GROUPS: ProductGroup[] = [
  {
    key: "cn", label: "Đất CN",
    totalM3: "earthCnTotalM3", totalTon: "earthCnTotalTon", totalTkm: "earthCnTotalTkm",
    surveyM3: "earthCnSurveyM3", surveyTon: "earthCnSurveyTon", surveyTkm: "earthCnSurveyTkm",
    hsM3: "earthCnHsM3", hsTon: "earthCnHsTon", hsTkm: "earthCnHsTkm",
  },
  {
    key: "sx", label: "Đất SX",
    totalM3: "earthSxTotalM3", totalTon: "earthSxTotalTon", totalTkm: "earthSxTotalTkm",
    surveyM3: "earthSxSurveyM3", surveyTon: "earthSxSurveyTon", surveyTkm: "earthSxSurveyTkm",
    hsM3: "earthSxHsM3", hsTon: "earthSxHsTon", hsTkm: "earthSxHsTkm",
  },
  {
    key: "coal", label: "Than SX",
    totalM3: "coalTotalM3", totalTon: "coalTotalTon", totalTkm: "coalTotalTkm",
    surveyM3: "coalSurveyM3", surveyTon: "coalSurveyTon", surveyTkm: "coalSurveyTkm",
    hsM3: "coalHsM3", hsTon: "coalHsTon", hsTkm: "coalHsTkm",
  },
];

const colKey = (g: ProductGroup, m: { id: string }) => `${g.key}.${m.id}`;

/**
 * Danh mục "Áp Trắc địa (m3-tấn-tkm)" — CHỈ XEM.
 *
 * Không có ô nhập nào: mỗi dòng đọc thẳng từ `SurveyCoefficient` (kind
 * AP_TDIA) mà nút "Tính lại kỳ" ở màn Báo cáo thống kê đã sinh sẵn, gộp theo
 * THÁNG (một tháng có thể chia nhiều kỳ — QĐ-05) và PIVOT ba khối Đất CN /
 * Đất SX / Than của cùng một khoá "Nhóm vỉa + Máy xúc" thành một dòng.
 *
 * Chưa có kỳ nào của tháng được "Tính lại kỳ" thì bảng rỗng — đây là màn chỉ
 * đọc, không có cách tự sinh dữ liệu từ đây.
 */
export default function AreaApplicationReportPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [excavatorCode, setExcavatorCode] = useState("");
  const [key, setKey] = useState("");
  const [searchYear, setSearchYear] = useState(today.getFullYear());

  const [excavators, setExcavators] = useState<NamedOption[]>([]);
  const [keys, setKeys] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/devices", {
          params: { categoryName: "Máy xúc", categoryGroup: "MAY", size: 500 },
        });
        setExcavators((res.data?.data?.content ?? []) as NamedOption[]);
      } catch {
        toast.error("Không tải được danh sách máy xúc.");
      }
    })();
    (async () => {
      try {
        const res = await api.get("/survey-standards/keys");
        setKeys((res.data?.data ?? []) as string[]);
      } catch {
        toast.error("Không tải được danh sách khoá Nhóm vỉa + Máy xúc.");
      }
    })();
  }, []);

  const { data: rows = [], isLoading, refetch } = useQuery({
    queryKey: ["ap-tracdia", searchYear, month, excavatorCode, key],
    queryFn: () => productionService.apTracDia(searchYear, month, excavatorCode, key),
  });

  const handleSearch = () => {
    setSearchYear(year);
    refetch();
  };

  const monthLabel = useMemo(
    () => `${String(month).padStart(2, "0")}/${searchYear}`,
    [month, searchYear],
  );

  // Cột bảng: 3 cột đầu + 27 cột số (3 sản phẩm × 9 chỉ tiêu)
  const columns = useMemo<ViewColumn[]>(
    () => [
      { key: "time", label: "Thời gian" },
      { key: "excavator", label: "Máy xúc" },
      { key: "key", label: "Nhóm vỉa + Máy xúc", strong: true },
      ...PRODUCT_GROUPS.flatMap((g) =>
        METRICS.map((m) => ({ key: colKey(g, m), label: m.label, align: "right" as const })),
      ),
    ],
    [],
  );
  const columnGroups = useMemo(
    // ba sắc xanh khác nhau: Đất CN đậm, Đất SX vừa, Than SX nhạt
    () => PRODUCT_GROUPS.map((g, i) => ({ label: g.label, keys: METRICS.map((m) => colKey(g, m)), tone: (i + 1) as 1 | 2 | 3 })),
    [],
  );

  const textOf = (r: AreaApplicationRow, k: string): string => {
    if (k === "time") return monthLabel;
    if (k === "excavator") return r.excavatorCode ?? "";
    if (k === "key") return r.seamGroupExcavatorKey;
    for (const g of PRODUCT_GROUPS) {
      for (const m of METRICS) {
        if (colKey(g, m) === k) return fmt(r[m.field(g)] as number | null);
      }
    }
    return "";
  };

  const handleExport = () => {
    if (rows.length === 0) {
      toast.warning("Chưa có dữ liệu để tải xuống.");
      return;
    }
    // Thứ tự cột khớp đúng bảng trên màn hình — gộp theo sản phẩm.
    const data = rows.map((r, i) => {
      const row: Record<string, unknown> = {
        STT: i + 1,
        "Thời gian": monthLabel,
        "Máy xúc": r.excavatorCode ?? "",
        "Nhóm vỉa + Máy xúc": r.seamGroupExcavatorKey,
      };
      for (const g of PRODUCT_GROUPS) {
        for (const m of METRICS) row[`${g.label} - ${m.label}`] = r[m.field(g)];
      }
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "AP Tdia");
    XLSX.writeFile(wb, `AP_Tdia_${String(month).padStart(2, "0")}_${searchYear}.xlsx`);
    toast.success(`Đã tải ${rows.length} dòng.`);
  };

  return (
    <DesignShell
      trail={["Danh mục", "Số Trắc địa"]}
      title="Áp Trắc địa (m3-tấn-tkm)"
      description="Danh mục áp trắc địa theo năm, máy xúc và nhóm vỉa"
    >
      <div className="ap-filters">
        <div className="ap-field">
          <span>Năm</span>
          <div className="ap-year">
            <input
              type="number"
              className="ap-input"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              aria-label="Năm"
            />
            <button type="button" className="btn btn-primary" onClick={handleSearch}>
              <DIcon name="search" />
              Tìm kiếm
            </button>
          </div>
        </div>
        <div className="ap-field">
          <span>Máy xúc</span>
          <select className="select ap-select" value={excavatorCode} onChange={(e) => setExcavatorCode(e.target.value)}>
            <option value="">Tất cả máy xúc</option>
            {excavators.map((m) => (
              <option key={m.id} value={m.code}>{m.code}</option>
            ))}
          </select>
        </div>
        <div className="ap-field">
          <span>Nhóm vỉa + Máy xúc</span>
          <select className="select ap-select" value={key} onChange={(e) => setKey(e.target.value)}>
            <option value="">Tất cả nhóm vỉa + máy xúc</option>
            {keys.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="ap-body">
        {/* Danh sách 12 tháng của năm đang xem */}
        <div className="ap-months">
          {MONTHS.map((m) => (
            <button key={m} type="button" className={m === month ? "on" : undefined} onClick={() => setMonth(m)}>
              <span className="ap-m-no">{m}</span>
              <span className="ap-m-label">{String(m).padStart(2, "0")}/{searchYear}</span>
              <DIcon name="eye" />
            </button>
          ))}
        </div>

        {/* Bảng của tháng đang chọn */}
        <div className="ap-main">
          <div className="ap-main-head">
            <h2>Áp Trắc Địa - {monthLabel}</h2>
            <button type="button" className="btn" onClick={handleExport} title="Tải file Excel của tháng đang xem">
              <DIcon name="download" />
              Tải xuống (Excel)
            </button>
          </div>
          <div className="tkc-modal-overlay vg-inline ap-grid">
            <ViewGrid
              columns={columns}
              rows={isLoading ? [] : rows}
              textOf={textOf}
              storageKey="view:ap-tracdia"
              columnGroups={columnGroups}
              emptyText={
                isLoading
                  ? "Đang tải…"
                  : `Chưa có dữ liệu — kỳ báo cáo của tháng ${monthLabel} chưa được "Tính lại kỳ" ở màn Báo cáo thống kê.`
              }
            />
          </div>
        </div>
      </div>
    </DesignShell>
  );
}
