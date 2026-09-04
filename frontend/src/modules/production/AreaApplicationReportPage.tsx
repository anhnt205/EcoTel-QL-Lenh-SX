import { Fragment, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Eye, Search } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import api from "@/config/api.config";
import { productionService, type AreaApplicationRow } from "./productionService";

interface NamedOption {
  id: number;
  code: string;
  name: string;
}

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

const fmt = (v: number | null, digits = 3): string => {
  if (v == null) return "—";
  return v.toLocaleString("vi-VN", { maximumFractionDigits: digits });
};

/**
 * Gộp theo SẢN PHẨM (Đất CN / Đất SX / Than SX) thay vì theo LOẠI SỐ LIỆU
 * (Tổng / Số Trắc địa / Hệ số) — mỗi sản phẩm một khối 9 cột liền nhau
 * (Tổng m3/tấn/tkm, Số TĐ m3/tấn/tkm, HS m3/tấn/tkm), tô MỘT màu riêng cho
 * cả khối. Trước đây ba loại số liệu tách thành ba khối lớn (Tổng, Số Trắc
 * địa, Hệ số) — muốn so ba con số của "Đất CN" phải nhảy mắt qua chín cột
 * ở giữa. Theo yêu cầu chủ dự án: gộp theo sản phẩm, tô màu để dễ đọc.
 */
const PRODUCT_GROUPS: {
  key: "cn" | "sx" | "coal";
  label: string;
  color: string;
  totalM3: keyof AreaApplicationRow;
  totalTon: keyof AreaApplicationRow;
  totalTkm: keyof AreaApplicationRow;
  surveyM3: keyof AreaApplicationRow;
  surveyTon: keyof AreaApplicationRow;
  surveyTkm: keyof AreaApplicationRow;
  hsM3: keyof AreaApplicationRow;
  hsTon: keyof AreaApplicationRow;
  hsTkm: keyof AreaApplicationRow;
}[] = [
  {
    key: "cn", label: "Đất CN", color: "#f59e0b",
    totalM3: "earthCnTotalM3", totalTon: "earthCnTotalTon", totalTkm: "earthCnTotalTkm",
    surveyM3: "earthCnSurveyM3", surveyTon: "earthCnSurveyTon", surveyTkm: "earthCnSurveyTkm",
    hsM3: "earthCnHsM3", hsTon: "earthCnHsTon", hsTkm: "earthCnHsTkm",
  },
  {
    key: "sx", label: "Đất SX", color: "#16a34a",
    totalM3: "earthSxTotalM3", totalTon: "earthSxTotalTon", totalTkm: "earthSxTotalTkm",
    surveyM3: "earthSxSurveyM3", surveyTon: "earthSxSurveyTon", surveyTkm: "earthSxSurveyTkm",
    hsM3: "earthSxHsM3", hsTon: "earthSxHsTon", hsTkm: "earthSxHsTkm",
  },
  {
    key: "coal", label: "Than SX", color: "#475569",
    totalM3: "coalTotalM3", totalTon: "coalTotalTon", totalTkm: "coalTotalTkm",
    surveyM3: "coalSurveyM3", surveyTon: "coalSurveyTon", surveyTkm: "coalSurveyTkm",
    hsM3: "coalHsM3", hsTon: "coalHsTon", hsTkm: "coalHsTkm",
  },
];
const METRIC_LABELS = ["Tổng m3", "Tổng KLVC (tấn)", "Tổng Tkm", "Số TĐ (m3)", "Số TĐ (tấn)", "Số TĐ (tkm)", "HS (m3)", "HS (tấn)", "HS (tkm)"];

/**
 * Danh mục "AP Tdia (m3-tấn-tkm)" — CHỈ XEM.
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

  const handleExport = () => {
    if (rows.length === 0) {
      toast.warning("Chưa có dữ liệu để tải xuống.");
      return;
    }
    // Thứ tự cột khớp đúng bảng trên màn hình — gộp theo sản phẩm, không
    // theo loại số liệu, xem doc `PRODUCT_GROUPS`.
    const data = rows.map((r, i) => {
      const row: Record<string, unknown> = {
        STT: i + 1,
        "Thời gian": `${String(month).padStart(2, "0")}/${searchYear}`,
        "Máy xúc": r.excavatorCode ?? "",
        "Nhóm vỉa + Máy xúc": r.seamGroupExcavatorKey,
      };
      for (const g of PRODUCT_GROUPS) {
        row[`${g.label} - Tổng m3`] = r[g.totalM3];
        row[`${g.label} - Tổng KLVC (tấn)`] = r[g.totalTon];
        row[`${g.label} - Tổng Tkm`] = r[g.totalTkm];
        row[`${g.label} - Số TĐ (m3)`] = r[g.surveyM3];
        row[`${g.label} - Số TĐ (tấn)`] = r[g.surveyTon];
        row[`${g.label} - Số TĐ (tkm)`] = r[g.surveyTkm];
        row[`${g.label} - HS (m3)`] = r[g.hsM3];
        row[`${g.label} - HS (tấn)`] = r[g.hsTon];
        row[`${g.label} - HS (tkm)`] = r[g.hsTkm];
      }
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "AP Tdia");
    XLSX.writeFile(wb, `AP_Tdia_${String(month).padStart(2, "0")}_${searchYear}.xlsx`);
    toast.success(`Đã tải ${rows.length} dòng.`);
  };

  const monthLabel = useMemo(
    () => `${String(month).padStart(2, "0")}/${searchYear}`,
    [month, searchYear],
  );

  return (
    <div className="flex h-full flex-col gap-4 p-4 md:p-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="#">Danh mục</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="#">Thống kê sản lượng</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Áp Trắc Địa (m3-tấn-tkm)</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <h1 className="mb-3 text-lg font-bold text-blue-700 dark:text-blue-400">
          Áp Trắc Địa (m3-tấn-tkm) - Danh mục
        </h1>
        <div className="flex flex-wrap items-end gap-4">
          <Field label="Năm">
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="h-9 w-[110px]"
              />
              <Button
                size="sm"
                onClick={handleSearch}
                className="h-9 gap-1.5 bg-blue-600 text-white hover:bg-blue-700"
              >
                <Search className="h-3.5 w-3.5" />
                Tìm kiếm
              </Button>
            </div>
          </Field>
          <Field label="Máy xúc">
            <select
              value={excavatorCode}
              onChange={(e) => setExcavatorCode(e.target.value)}
              className="h-9 min-w-[220px] rounded-md border bg-transparent px-2 text-sm"
            >
              <option value="">Tất cả máy xúc</option>
              {excavators.map((m) => (
                <option key={m.id} value={m.code}>{m.code}</option>
              ))}
            </select>
          </Field>
          <Field label="Nhóm vỉa + Máy xúc">
            <select
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="h-9 min-w-[240px] rounded-md border bg-transparent px-2 text-sm"
            >
              <option value="">Tất cả nhóm vỉa + máy xúc</option>
              {keys.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 gap-4">
        {/* Danh sách 12 tháng của năm đang xem */}
        <div className="w-[210px] shrink-0 overflow-y-auto rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          {MONTHS.map((m) => (
            <button
              key={m}
              onClick={() => setMonth(m)}
              className={`flex w-full items-center justify-between border-b border-gray-100 px-3 py-2.5 text-sm last:border-b-0 dark:border-gray-800 ${
                m === month
                  ? "bg-blue-50 font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
                  : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800/60"
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="text-gray-400">{m}</span>
                {String(m).padStart(2, "0")}/{searchYear}
              </span>
              <Eye className="h-4 w-4 text-gray-400" />
            </button>
          ))}
        </div>

        {/* Bảng của tháng đang chọn */}
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">
              Áp Trắc Địa - {monthLabel}
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="h-8 gap-1.5 text-xs"
            >
              <Download className="h-3.5 w-3.5" />
              Tải xuống (Excel)
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400">
            {PRODUCT_GROUPS.map((g) => (
              <span key={g.key} className="flex items-center gap-1.5">
                <i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: g.color }} />
                {g.label}
              </span>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="w-full min-w-[2200px] border-collapse text-xs">
              <thead>
                <tr className="bg-gray-100 text-center font-bold text-gray-800 dark:bg-gray-900 dark:text-gray-100">
                  <th rowSpan={2} className={thCls}>STT</th>
                  <th rowSpan={2} className={thCls}>Thời gian</th>
                  <th rowSpan={2} className={thCls}>Máy xúc</th>
                  <th rowSpan={2} className={`${thCls} min-w-[180px]`}>Nhóm vỉa + Máy xúc</th>
                  {PRODUCT_GROUPS.map((g) => (
                    <th
                      key={g.key}
                      colSpan={9}
                      className={thCls}
                      style={{ background: `color-mix(in srgb, ${g.color} 22%, white)` }}
                    >
                      {g.label}
                    </th>
                  ))}
                </tr>
                <tr className="text-center font-semibold text-gray-600 dark:text-gray-300">
                  {PRODUCT_GROUPS.map((g) =>
                    METRIC_LABELS.map((label) => (
                      <th
                        key={`${g.key}-${label}`}
                        className={thCls}
                        style={{ background: `color-mix(in srgb, ${g.color} 8%, white)` }}
                      >
                        {label}
                      </th>
                    )),
                  )}
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={31} className="p-6 text-center text-gray-400">Đang tải…</td>
                  </tr>
                )}
                {!isLoading && rows.length === 0 && (
                  <tr>
                    <td colSpan={31} className="p-8 text-center text-gray-400">
                      Chưa có dữ liệu — kỳ báo cáo của tháng {monthLabel} chưa được "Tính lại kỳ"
                      ở màn Báo cáo thống kê.
                    </td>
                  </tr>
                )}
                {rows.map((r, i) => (
                  <tr
                    key={`${r.seamGroupExcavatorKey}_${i}`}
                    className={i % 2 === 0 ? "bg-white dark:bg-gray-950" : "bg-gray-50/50 dark:bg-gray-900/40"}
                  >
                    <td className={tdCls}>{i + 1}</td>
                    <td className={tdCls}>{monthLabel}</td>
                    <td className={tdCls}>{r.excavatorCode ?? "—"}</td>
                    <td className={`${tdCls} text-left`}>{r.seamGroupExcavatorKey}</td>
                    {PRODUCT_GROUPS.map((g) => (
                      <Fragment key={g.key}>
                        <td className={tdCls} style={{ background: `color-mix(in srgb, ${g.color} 4%, white)` }}>{fmt(r[g.totalM3] as number | null)}</td>
                        <td className={tdCls} style={{ background: `color-mix(in srgb, ${g.color} 4%, white)` }}>{fmt(r[g.totalTon] as number | null)}</td>
                        <td className={tdCls} style={{ background: `color-mix(in srgb, ${g.color} 4%, white)` }}>{fmt(r[g.totalTkm] as number | null)}</td>
                        <td className={tdCls} style={{ background: `color-mix(in srgb, ${g.color} 8%, white)` }}>{fmt(r[g.surveyM3] as number | null)}</td>
                        <td className={tdCls} style={{ background: `color-mix(in srgb, ${g.color} 8%, white)` }}>{fmt(r[g.surveyTon] as number | null)}</td>
                        <td className={tdCls} style={{ background: `color-mix(in srgb, ${g.color} 8%, white)` }}>{fmt(r[g.surveyTkm] as number | null)}</td>
                        <td className={tdCls} style={{ background: `color-mix(in srgb, ${g.color} 14%, white)`, color: g.color, fontWeight: 700 }}>{fmt(r[g.hsM3] as number | null)}</td>
                        <td className={tdCls} style={{ background: `color-mix(in srgb, ${g.color} 14%, white)`, color: g.color, fontWeight: 700 }}>{fmt(r[g.hsTon] as number | null)}</td>
                        <td className={tdCls} style={{ background: `color-mix(in srgb, ${g.color} 14%, white)`, color: g.color, fontWeight: 700 }}>{fmt(r[g.hsTkm] as number | null)}</td>
                      </Fragment>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

const thCls = "border-b border-r border-gray-200 dark:border-gray-700 px-2 py-1.5 whitespace-nowrap";
const tdCls = "border-b border-r border-gray-100 dark:border-gray-800 px-2 py-1.5 text-center whitespace-nowrap";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</span>
      {children}
    </div>
  );
}
