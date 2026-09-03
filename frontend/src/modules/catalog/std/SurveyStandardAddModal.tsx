import { useEffect, useRef, useState } from "react";
import { Maximize, Minimize, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import api from "@/config/api.config";
import { createCatalogService } from "../catalogService";
import { surveyStandardDatSxConfig } from "../configs";

interface NamedOption {
  id: number;
  code: string;
  name: string;
}

/** Payload gửi lên — khớp `SurveyStandardRequest` phía backend. */
interface SurveyStandardPayload {
  id?: number;
  catalogType: "DAT_SX_THAN_SX";
  seamGroupExcavatorKey: string;
  effectiveFrom: string;
  effectiveTo: string;
  earthAcceptanceProduct: string;
  earthM3: number | null;
  earthDesignVolume: number | null;
  earthDeviation: number | null;
  earthTon: number | null;
  earthHaulDistance: number | null;
  earthBulkDensity: number | null;
  earthTkm: number | null;
  coalAcceptanceProduct: string;
  coalM3: number | null;
  coalBulkDensity: number | null;
  coalTon: number | null;
  coalDesignVolume: number | null;
  coalDeviation: number | null;
  coalHaulDistance: number | null;
  coalTkm: number | null;
  note: string | null;
}

/** Sáu thành phần ghép khoá "Nhóm vỉa + Máy xúc" — áp cho CẢ HÀNG, không đổi theo từng khoảng thời gian. */
interface KeyFields {
  seamGroup: string;
  benchGroup: string;
  excavator: string;
  mudMark: string;
  excavationArea: string;
  suffix: string;
}

const emptyKeyFields = (): KeyFields => ({
  seamGroup: "",
  benchGroup: "",
  excavator: "",
  mudMark: "",
  excavationArea: "",
  suffix: "",
});

/** Một khoảng thời gian hiệu lực, kèm 14 ô giá trị Đất SX/Than SX của riêng nó. */
interface Period {
  id: number;
  effectiveFrom: string;
  effectiveTo: string;
  earthM3: string;
  earthDesignVolume: string;
  earthDeviation: string;
  earthTon: string;
  earthHaulDistance: string;
  earthBulkDensity: string;
  earthTkm: string;
  coalM3: string;
  coalBulkDensity: string;
  coalTon: string;
  coalDesignVolume: string;
  coalDeviation: string;
  coalHaulDistance: string;
  coalTkm: string;
  note: string;
}

const emptyPeriod = (from: string, to: string, nextId: () => number): Period => ({
  id: nextId(),
  effectiveFrom: from,
  effectiveTo: to,
  earthM3: "",
  earthDesignVolume: "",
  earthDeviation: "",
  earthTon: "",
  earthHaulDistance: "",
  earthBulkDensity: "",
  earthTkm: "",
  coalM3: "",
  coalBulkDensity: "",
  coalTon: "",
  coalDesignVolume: "",
  coalDeviation: "",
  coalHaulDistance: "",
  coalTkm: "",
  note: "",
});

/** Một dòng khai báo = một khoá "Nhóm vỉa + Máy xúc", có thể có nhiều khoảng thời gian. */
interface Row {
  id: number;
  key: KeyFields;
  /** Khoá đã ghép — luôn tính ở BACKEND, không tự ghép ở đây (xem doc dưới). */
  composedKey: string;
  periods: Period[];
}

const currentYear = new Date().getFullYear();

/** yyyy-MM-dd, tính theo UTC-nửa đêm để tránh lệch ngày do múi giờ máy khách. */
const parseISO = (s: string) => new Date(`${s}T00:00:00Z`);
const toISO = (d: Date) => d.toISOString().slice(0, 10);
const ONE_DAY_MS = 86_400_000;

const numOrNull = (s: string): number | null => {
  const t = s.trim();
  return t === "" ? null : Number(t.replace(",", "."));
};

/** Hai khoảng chồng lấn khi khoảng sau bắt đầu trước khi khoảng trước kết thúc. */
const hasOverlap = (periods: Period[]) => {
  const sorted = [...periods].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].effectiveFrom <= sorted[i - 1].effectiveTo) return true;
  }
  return false;
};

const service = createCatalogService<SurveyStandardPayload>(surveyStandardDatSxConfig.basePath);

/**
 * Modal "Thêm mới STD (Đất SX/Than SX)" — thiết kế riêng, thay cho modal
 * chung `CatalogFormModal` ở chế độ thêm mới cho đúng màn này.
 *
 * <b>Khác biệt cốt lõi:</b> trước đây ô "Nhóm vỉa + Máy xúc" là MỘT Ô GÕ TỰ
 * DO — người dùng phải mở một hộp thoại "Dựng khoá" riêng, chép chuỗi kết
 * quả, rồi dán tay vào ô đó (xem {@link ../std/SeamGroupKeyBuilder}, vẫn
 * dùng ở màn STD (Đất CN)). Ở đây SÁU thành phần của khoá nằm NGAY trên
 * dòng, và khoá được ghép sống — gõ đến đâu, dòng chữ khoá hiện ra đến đó.
 *
 * <b>Khoá luôn ghép ở BACKEND</b> (gọi {@code POST /survey-standards/build-key}),
 * không tự ghép ở đây: đây chính là hàm engine tính sản lượng dùng để suy
 * khoá của mỗi chuyến — ghép lệch dù chỉ một dấu gạch dưới thì dòng danh
 * mục sẽ không bao giờ khớp, và triệu chứng là "thiếu dữ liệu STD" chứ
 * không phải một lỗi rõ ràng.
 *
 * <b>Một DÒNG = một khoá, có thể nhiều KHOẢNG THỜI GIAN.</b> Sáu ô ghép khoá
 * áp cho cả dòng — tách thời gian không đổi khoá, vì cùng một vỉa + máy xúc
 * vật lý chỉ đổi số liệu trắc địa theo giai đoạn, không đổi máy xúc. Nút
 * "+" trên MỌI khoảng đều tách được — bấm lại vào khoảng vừa tách để chia
 * tiếp, tuỳ ý. Muốn khai một khoá KHÁC hẳn thì bấm "Thêm dòng mới" ở cuối
 * bảng — đó mới là dòng độc lập.
 *
 * Lưu xuống vẫn PHẲNG: mỗi khoảng thời gian của mỗi dòng là một bản ghi
 * `SurveyStandardRequest` riêng, gửi qua `/survey-standards/bulk`.
 */
export function SurveyStandardAddModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [batchFrom, setBatchFrom] = useState(`${currentYear}-01-01`);
  const [batchTo, setBatchTo] = useState(`${currentYear}-12-31`);
  const [rows, setRows] = useState<Row[]>([]);
  const [seamGroups, setSeamGroups] = useState<NamedOption[]>([]);
  const [excavationAreas, setExcavationAreas] = useState<NamedOption[]>([]);
  const [excavators, setExcavators] = useState<NamedOption[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rowIdRef = useRef(0);
  const nextRowId = () => ++rowIdRef.current;
  const periodIdRef = useRef(0);
  const nextPeriodId = () => ++periodIdRef.current;

  const makeRow = (): Row => ({
    id: nextRowId(),
    key: emptyKeyFields(),
    composedKey: "",
    periods: [emptyPeriod(batchFrom, batchTo, nextPeriodId)],
  });

  // batchFrom/batchTo đổi không được kéo lùi ngày của các dòng ĐÃ có — chỉ
  // dòng MỚI thêm sau đó mới dùng khoảng mặc định hiện tại. Giữ trong ref để
  // `addRow` không cần đưa batchFrom/batchTo vào deps của nơi gọi.
  const batchRef = useRef({ batchFrom, batchTo });
  batchRef.current = { batchFrom, batchTo };

  // Nạp lại từ đầu mỗi lần mở — đóng rồi mở lại coi như một lượt khai mới.
  useEffect(() => {
    if (!open) return;
    setBatchFrom(`${currentYear}-01-01`);
    setBatchTo(`${currentYear}-12-31`);
    setRows([makeRow()]);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const res = await api.get("/seam-groups", { params: { size: 500 } });
        setSeamGroups((res.data?.data?.content ?? []) as NamedOption[]);
      } catch {
        toast.error("Không tải được danh sách nhóm vỉa.");
      }
    })();
    (async () => {
      try {
        const res = await api.get("/excavation-areas", { params: { size: 500 } });
        setExcavationAreas((res.data?.data?.content ?? []) as NamedOption[]);
      } catch {
        toast.error("Không tải được danh sách khu vực xúc.");
      }
    })();
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
  }, [open]);

  // Ghép khoá SỐNG cho mọi dòng — gọi backend mỗi khi sáu ô của dòng nào đó
  // đổi. Debounce 300ms để không gọi dồn dập lúc đang gõ.
  const keySignature = JSON.stringify(rows.map((r) => r.key));
  useEffect(() => {
    if (!open || rows.length === 0) return;
    const timer = setTimeout(async () => {
      const updated = await Promise.all(
        rows.map(async (r) => {
          const { seamGroup, benchGroup, excavator, mudMark, excavationArea, suffix } = r.key;
          if (!seamGroup && !benchGroup && !excavator && !mudMark && !excavationArea && !suffix) {
            return { ...r, composedKey: "" };
          }
          try {
            const res = await api.post("/survey-standards/build-key", {
              seamGroup, benchGroup, excavator, mudMark, excavationArea, suffix,
            });
            return { ...r, composedKey: res.data?.data?.key ?? "" };
          } catch {
            return { ...r, composedKey: "" };
          }
        }),
      );
      setRows(updated);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, keySignature]);

  if (!open) return null;

  const addRow = () =>
    setRows((prev) => [
      ...prev,
      {
        id: nextRowId(),
        key: emptyKeyFields(),
        composedKey: "",
        periods: [emptyPeriod(batchRef.current.batchFrom, batchRef.current.batchTo, nextPeriodId)],
      },
    ]);

  const removeRow = (rowId: number) =>
    setRows((prev) => (prev.length === 1 ? prev : prev.filter((r) => r.id !== rowId)));

  const setKeyField = (rowId: number, field: keyof KeyFields, value: string) =>
    setRows((prev) =>
      prev.map((r) => (r.id !== rowId ? r : { ...r, key: { ...r.key, [field]: value } })),
    );

  const setPeriodField = (
    rowId: number,
    periodId: number,
    field: keyof Omit<Period, "id">,
    value: string,
  ) =>
    setRows((prev) =>
      prev.map((r) =>
        r.id !== rowId
          ? r
          : {
              ...r,
              periods: r.periods.map((p) => (p.id !== periodId ? p : { ...p, [field]: value })),
            },
      ),
    );

  /** Tách MỘT khoảng bất kỳ của dòng thành hai khoảng liền kề — xem doc đầu file. */
  const splitPeriod = (rowId: number, periodId: number) =>
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const idx = r.periods.findIndex((p) => p.id === periodId);
        if (idx === -1) return r;
        const target = r.periods[idx];
        const fromMs = parseISO(target.effectiveFrom).getTime();
        const toMs = parseISO(target.effectiveTo).getTime();
        const totalDays = Math.round((toMs - fromMs) / ONE_DAY_MS);
        if (!(totalDays > 0)) {
          toast.error("Khoảng thời gian này chỉ có 1 ngày, không tách được.");
          return r;
        }
        const midMs = fromMs + Math.floor(totalDays / 2) * ONE_DAY_MS;
        const firstTo = toISO(new Date(midMs));
        const secondFrom = toISO(new Date(midMs + ONE_DAY_MS));
        const periods = [...r.periods];
        periods.splice(
          idx,
          1,
          { ...target, effectiveTo: firstTo },
          { ...target, id: nextPeriodId(), effectiveFrom: secondFrom },
        );
        return { ...r, periods };
      }),
    );

  const removePeriod = (rowId: number, periodId: number) =>
    setRows((prev) =>
      prev.map((r) =>
        r.id !== rowId || r.periods.length === 1
          ? r
          : { ...r, periods: r.periods.filter((p) => p.id !== periodId) },
      ),
    );

  const validate = (): string | null => {
    if (rows.length === 0) return "Chưa có dòng nào.";
    for (let ri = 0; ri < rows.length; ri++) {
      const r = rows[ri];
      if (!r.composedKey.trim()) {
        return `Dòng ${ri + 1}: chưa đủ thông tin để ghép khoá "Nhóm vỉa + Máy xúc".`;
      }
      for (let i = 0; i < r.periods.length; i++) {
        const p = r.periods[i];
        if (!p.effectiveFrom || !p.effectiveTo) {
          return `Dòng ${ri + 1}, khoảng ${i + 1}: chưa chọn đủ ngày.`;
        }
        if (p.effectiveFrom > p.effectiveTo) {
          return `Dòng ${ri + 1}, khoảng ${i + 1}: "Từ ngày" phải trước "Đến ngày".`;
        }
      }
      if (hasOverlap(r.periods)) {
        return `Dòng ${ri + 1} (khoá "${r.composedKey}"): các khoảng thời gian bị chồng lấn nhau.`;
      }
    }
    return null;
  };

  const handleSubmit = async () => {
    const msg = validate();
    if (msg) {
      setError(msg);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const payloads: Omit<SurveyStandardPayload, "id">[] = rows.flatMap((r) =>
        r.periods.map((p) => ({
          catalogType: "DAT_SX_THAN_SX",
          seamGroupExcavatorKey: r.composedKey,
          effectiveFrom: p.effectiveFrom,
          effectiveTo: p.effectiveTo,
          earthAcceptanceProduct: "Đất SX",
          earthM3: numOrNull(p.earthM3),
          earthDesignVolume: numOrNull(p.earthDesignVolume),
          earthDeviation: numOrNull(p.earthDeviation),
          earthTon: numOrNull(p.earthTon),
          earthHaulDistance: numOrNull(p.earthHaulDistance),
          earthBulkDensity: numOrNull(p.earthBulkDensity),
          earthTkm: numOrNull(p.earthTkm),
          coalAcceptanceProduct: "Than SX",
          coalM3: numOrNull(p.coalM3),
          coalBulkDensity: numOrNull(p.coalBulkDensity),
          coalTon: numOrNull(p.coalTon),
          coalDesignVolume: numOrNull(p.coalDesignVolume),
          coalDeviation: numOrNull(p.coalDeviation),
          coalHaulDistance: numOrNull(p.coalHaulDistance),
          coalTkm: numOrNull(p.coalTkm),
          note: p.note.trim() || null,
        })),
      );
      await service.bulkCreate(payloads);
      toast.success(`Đã thêm ${payloads.length} dòng STD (Đất SX/Than SX).`);
      onSaved();
      onClose();
    } catch (e: unknown) {
      const res = (e as { response?: { data?: { message?: string } } }).response;
      setError(res?.data?.message ?? "Lưu thất bại. Kiểm tra lại dữ liệu.");
    } finally {
      setSubmitting(false);
    }
  };

  const totalPeriods = rows.reduce((n, r) => n + r.periods.length, 0);

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/40 ${isFullscreen ? "" : "p-4"}`}
    >
      <div
        className={
          isFullscreen
            ? "flex h-screen w-screen flex-col overflow-hidden bg-white dark:bg-gray-900"
            : "flex max-h-[90vh] w-full max-w-[1600px] flex-col overflow-hidden rounded-xl bg-white shadow-xl dark:bg-gray-900"
        }
      >
        {/* Tiêu đề */}
        <div className="flex items-start justify-between border-b border-gray-200 dark:border-gray-800 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Thêm mới STD (Đất SX/Than SX)
            </h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Có thể thêm nhiều dòng STD (Đất SX/Than SX) và lưu một lần
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsFullscreen((v) => !v)}
              title={isFullscreen ? "Thu nhỏ" : "Toàn màn hình"}
              className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
            >
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </button>
            <button
              onClick={onClose}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Thân */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Thời gian mặc định — chỉ áp cho dòng MỚI thêm sau đó */}
          <div className="mb-4 flex flex-wrap items-end gap-4">
            <Field label="Thời gian *">
              <div className="flex items-center gap-1.5">
                <Input
                  type="date"
                  value={batchFrom}
                  onChange={(e) => setBatchFrom(e.target.value)}
                  className="h-9 w-[150px] text-sm"
                />
                <span className="text-gray-400">–</span>
                <Input
                  type="date"
                  value={batchTo}
                  onChange={(e) => setBatchTo(e.target.value)}
                  className="h-9 w-[150px] text-sm"
                />
              </div>
            </Field>
            <p className="pb-2 text-xs text-gray-500 dark:text-gray-400">
              Khoảng mặc định cho dòng thêm mới — dòng đã có giữ nguyên thời gian đã tách.
            </p>
          </div>

          <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
            Tổng số{" "}
            <span className="font-semibold text-blue-700 dark:text-blue-400">
              STD (Đất SX/Than SX): {rows.length}
            </span>
          </p>

          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="w-full min-w-[1800px] border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-900 text-center text-xs font-bold text-gray-800 dark:text-gray-100">
                  <th rowSpan={2} className="w-14 border-b border-r border-gray-200 dark:border-gray-700 px-2 py-2 align-middle">
                    #
                  </th>
                  <th rowSpan={2} className="border-b border-r border-gray-200 dark:border-gray-700 px-2 py-2 align-middle min-w-[230px]">
                    Thời gian
                  </th>
                  <th colSpan={6} className="border-b border-r border-gray-200 dark:border-gray-700 px-2 py-2">
                    Nhóm vỉa + Máy xúc
                  </th>
                  <th colSpan={7} className="border-b border-r border-gray-200 dark:border-gray-700 px-2 py-2">
                    Đất SX
                  </th>
                  <th colSpan={7} className="border-b border-r border-gray-200 dark:border-gray-700 px-2 py-2">
                    Than SX
                  </th>
                  <th rowSpan={2} className="border-b border-r border-gray-200 dark:border-gray-700 px-2 py-2 align-middle min-w-[140px]">
                    Ghi chú
                  </th>
                  <th rowSpan={2} className="w-10 border-b border-gray-200 dark:border-gray-700" />
                </tr>
                <tr className="bg-gray-50 dark:bg-gray-900/60 text-center text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                  <th className="border-b border-r border-gray-200 dark:border-gray-700 px-2 py-1.5 min-w-[110px]">Nhóm vỉa</th>
                  <th className="border-b border-r border-gray-200 dark:border-gray-700 px-2 py-1.5 min-w-[90px]">Nhóm tầng</th>
                  <th className="border-b border-r border-gray-200 dark:border-gray-700 px-2 py-1.5 min-w-[100px]">Máy xúc</th>
                  <th className="border-b border-r border-gray-200 dark:border-gray-700 px-2 py-1.5 min-w-[100px]">Ký hiệu bùn</th>
                  <th className="border-b border-r border-gray-200 dark:border-gray-700 px-2 py-1.5 min-w-[110px]">Khu vực xúc</th>
                  <th className="border-b border-r border-gray-200 dark:border-gray-700 px-2 py-1.5 min-w-[90px]">Hậu tố</th>
                  <th className="border-b border-r border-gray-200 dark:border-gray-700 px-2 py-1.5 min-w-[100px]">Đất SX (m3)</th>
                  <th className="border-b border-r border-gray-200 dark:border-gray-700 px-2 py-1.5 min-w-[90px]">V Tke</th>
                  <th className="border-b border-r border-gray-200 dark:border-gray-700 px-2 py-1.5 min-w-[90px]">Clech</th>
                  <th className="border-b border-r border-gray-200 dark:border-gray-700 px-2 py-1.5 min-w-[100px]">Đất SX (tấn)</th>
                  <th className="border-b border-r border-gray-200 dark:border-gray-700 px-2 py-1.5 min-w-[90px]">CD đất</th>
                  <th className="border-b border-r border-gray-200 dark:border-gray-700 px-2 py-1.5 min-w-[120px]">Thể trọng đất (TĐ)</th>
                  <th className="border-b border-r border-gray-200 dark:border-gray-700 px-2 py-1.5 min-w-[100px]">Đất SX (tkm)</th>
                  <th className="border-b border-r border-gray-200 dark:border-gray-700 px-2 py-1.5 min-w-[100px]">Than SX (m3)</th>
                  <th className="border-b border-r border-gray-200 dark:border-gray-700 px-2 py-1.5 min-w-[120px]">Thể trọng than (TĐ)</th>
                  <th className="border-b border-r border-gray-200 dark:border-gray-700 px-2 py-1.5 min-w-[100px]">Than SX (tấn)</th>
                  <th className="border-b border-r border-gray-200 dark:border-gray-700 px-2 py-1.5 min-w-[90px]">Q Tke</th>
                  <th className="border-b border-r border-gray-200 dark:border-gray-700 px-2 py-1.5 min-w-[90px]">Clech</th>
                  <th className="border-b border-r border-gray-200 dark:border-gray-700 px-2 py-1.5 min-w-[90px]">CD than</th>
                  <th className="border-b border-r border-gray-200 dark:border-gray-700 px-2 py-1.5 min-w-[100px]">Than SX (Tkm)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, ri) => (
                  <RowGroup
                    key={r.id}
                    row={r}
                    rowIndex={ri}
                    seamGroups={seamGroups}
                    excavationAreas={excavationAreas}
                    excavators={excavators}
                    canRemoveRow={rows.length > 1}
                    onRemoveRow={() => removeRow(r.id)}
                    onKeyFieldChange={(field, value) => setKeyField(r.id, field, value)}
                    onPeriodFieldChange={(periodId, field, value) =>
                      setPeriodField(r.id, periodId, field, value)
                    }
                    onSplitPeriod={(periodId) => splitPeriod(r.id, periodId)}
                    onRemovePeriod={(periodId) => removePeriod(r.id, periodId)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={addRow}
            className="mt-3 gap-1.5 text-sm text-blue-700 hover:bg-blue-50 dark:text-blue-400"
          >
            <Plus className="h-4 w-4" />
            Thêm dòng mới (một khoá "Nhóm vỉa + Máy xúc" khác)
          </Button>

          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            Tổng{" "}
            <span className="font-semibold text-blue-700 dark:text-blue-400">
              {rows.length} khoá · {totalPeriods} khoảng thời gian
            </span>
          </p>

          {error && (
            <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </p>
          )}
        </div>

        {/* Chân */}
        <div className="flex justify-end gap-3 border-t border-gray-200 dark:border-gray-800 px-6 py-4">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Huỷ
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-blue-600 font-semibold text-white hover:bg-blue-700"
          >
            {submitting ? "Đang lưu..." : "Xác nhận"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Một DÒNG khoá — có thể chiếm nhiều `<tr>` (một cho mỗi khoảng thời gian). */
function RowGroup({
  row,
  rowIndex,
  seamGroups,
  excavationAreas,
  excavators,
  canRemoveRow,
  onRemoveRow,
  onKeyFieldChange,
  onPeriodFieldChange,
  onSplitPeriod,
  onRemovePeriod,
}: {
  row: Row;
  rowIndex: number;
  seamGroups: NamedOption[];
  excavationAreas: NamedOption[];
  excavators: NamedOption[];
  canRemoveRow: boolean;
  onRemoveRow: () => void;
  onKeyFieldChange: (field: keyof KeyFields, value: string) => void;
  onPeriodFieldChange: (periodId: number, field: keyof Omit<Period, "id">, value: string) => void;
  onSplitPeriod: (periodId: number) => void;
  onRemovePeriod: (periodId: number) => void;
}) {
  const span = row.periods.length;
  const zebra = rowIndex % 2 === 0 ? "bg-white dark:bg-gray-950" : "bg-gray-50/50 dark:bg-gray-900/40";
  const cellCls = "border-b border-r border-gray-200 dark:border-gray-700 px-2 py-1.5";

  return (
    <>
      {row.periods.map((p, pi) => (
        <tr key={p.id} className={`${zebra} ${pi === 0 && rowIndex > 0 ? "border-t-2 border-t-gray-300 dark:border-t-gray-600" : ""}`}>
          {pi === 0 && (
            <>
              <td rowSpan={span} className={`${cellCls} text-center align-top`}>
                <div className="flex items-center justify-center gap-1 pt-1">
                  <span className="font-semibold text-gray-500">{rowIndex + 1}</span>
                  {canRemoveRow && (
                    <button
                      onClick={onRemoveRow}
                      title="Xoá cả dòng này"
                      className="rounded p-0.5 text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </td>
            </>
          )}

          <td className={`${cellCls} align-top`}>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onSplitPeriod(p.id)}
                title="Tách khoảng thời gian này thành hai"
                className="rounded p-0.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/30"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              <Input
                type="date"
                value={p.effectiveFrom}
                onChange={(e) => onPeriodFieldChange(p.id, "effectiveFrom", e.target.value)}
                className="h-9 text-xs"
              />
              <span className="text-gray-400">–</span>
              <Input
                type="date"
                value={p.effectiveTo}
                onChange={(e) => onPeriodFieldChange(p.id, "effectiveTo", e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </td>

          {pi === 0 && (
            <>
              <td rowSpan={span} className={`${cellCls} align-top min-w-[110px]`}>
                <select
                  value={row.key.seamGroup}
                  onChange={(e) => onKeyFieldChange("seamGroup", e.target.value)}
                  className="h-9 w-full rounded-md border bg-transparent px-1.5 text-xs"
                >
                  <option value="">—</option>
                  {seamGroups.map((s) => (
                    <option key={s.id} value={s.code}>{s.name}</option>
                  ))}
                </select>
              </td>
              <td rowSpan={span} className={`${cellCls} align-top`}>
                <Input
                  type="number"
                  step="any"
                  value={row.key.benchGroup}
                  onChange={(e) => onKeyFieldChange("benchGroup", e.target.value)}
                  placeholder="75"
                  className="h-9 text-xs"
                />
              </td>
              <td rowSpan={span} className={`${cellCls} align-top`}>
                <select
                  value={row.key.excavator}
                  onChange={(e) => onKeyFieldChange("excavator", e.target.value)}
                  className="h-9 w-full rounded-md border bg-transparent px-1.5 text-xs"
                >
                  <option value="">—</option>
                  {excavators.map((m) => (
                    <option key={m.id} value={m.code}>{m.code}</option>
                  ))}
                </select>
              </td>
              <td rowSpan={span} className={`${cellCls} align-top`}>
                <Input
                  value={row.key.mudMark}
                  onChange={(e) => onKeyFieldChange("mudMark", e.target.value)}
                  placeholder="vd Bun"
                  className="h-9 text-xs"
                />
              </td>
              <td rowSpan={span} className={`${cellCls} align-top`}>
                <select
                  value={row.key.excavationArea}
                  onChange={(e) => onKeyFieldChange("excavationArea", e.target.value)}
                  className="h-9 w-full rounded-md border bg-transparent px-1.5 text-xs"
                >
                  <option value="">—</option>
                  {excavationAreas.map((a) => (
                    <option key={a.id} value={a.code}>{a.name}</option>
                  ))}
                </select>
              </td>
              <td rowSpan={span} className={`${cellCls} align-top`}>
                <Input
                  value={row.key.suffix}
                  onChange={(e) => onKeyFieldChange("suffix", e.target.value)}
                  placeholder="vd BK"
                  className="h-9 text-xs"
                />
              </td>
            </>
          )}

          <NumCell value={p.earthM3} onChange={(v) => onPeriodFieldChange(p.id, "earthM3", v)} />
          <NumCell value={p.earthDesignVolume} onChange={(v) => onPeriodFieldChange(p.id, "earthDesignVolume", v)} />
          <NumCell value={p.earthDeviation} onChange={(v) => onPeriodFieldChange(p.id, "earthDeviation", v)} />
          <NumCell value={p.earthTon} onChange={(v) => onPeriodFieldChange(p.id, "earthTon", v)} />
          <NumCell value={p.earthHaulDistance} onChange={(v) => onPeriodFieldChange(p.id, "earthHaulDistance", v)} />
          <NumCell value={p.earthBulkDensity} onChange={(v) => onPeriodFieldChange(p.id, "earthBulkDensity", v)} />
          <NumCell value={p.earthTkm} onChange={(v) => onPeriodFieldChange(p.id, "earthTkm", v)} />

          <NumCell value={p.coalM3} onChange={(v) => onPeriodFieldChange(p.id, "coalM3", v)} />
          <NumCell value={p.coalBulkDensity} onChange={(v) => onPeriodFieldChange(p.id, "coalBulkDensity", v)} />
          <NumCell value={p.coalTon} onChange={(v) => onPeriodFieldChange(p.id, "coalTon", v)} />
          <NumCell value={p.coalDesignVolume} onChange={(v) => onPeriodFieldChange(p.id, "coalDesignVolume", v)} />
          <NumCell value={p.coalDeviation} onChange={(v) => onPeriodFieldChange(p.id, "coalDeviation", v)} />
          <NumCell value={p.coalHaulDistance} onChange={(v) => onPeriodFieldChange(p.id, "coalHaulDistance", v)} />
          <NumCell value={p.coalTkm} onChange={(v) => onPeriodFieldChange(p.id, "coalTkm", v)} />

          <td className={cellCls}>
            <Input
              value={p.note}
              onChange={(e) => onPeriodFieldChange(p.id, "note", e.target.value)}
              className="h-9 text-xs"
            />
          </td>
          <td className="border-b border-gray-200 dark:border-gray-700 px-1.5 py-1.5 text-center">
            {row.periods.length > 1 && (
              <button
                onClick={() => onRemovePeriod(p.id)}
                title="Xoá khoảng thời gian này"
                className="rounded p-1 text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </td>
        </tr>
      ))}
      <tr className={zebra}>
        <td colSpan={2} className="border-b border-r border-gray-200 dark:border-gray-700" />
        <td colSpan={6} className="border-b border-r border-gray-200 dark:border-gray-700 px-2 py-1 font-mono text-[11px] text-gray-500 dark:text-gray-400">
          {row.composedKey || <span className="italic text-gray-400">(chưa đủ thông tin để ghép khoá)</span>}
        </td>
        <td colSpan={16} className="border-b border-gray-200 dark:border-gray-700" />
      </tr>
    </>
  );
}

function NumCell({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <td className="border-b border-r border-gray-200 dark:border-gray-700 px-2 py-1.5">
      <Input
        type="number"
        step="any"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 text-xs"
      />
    </td>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</span>
      {children}
    </div>
  );
}
