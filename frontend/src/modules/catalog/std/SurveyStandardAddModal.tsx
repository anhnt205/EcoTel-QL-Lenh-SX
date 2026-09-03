import { useEffect, useRef, useState } from "react";
import { Copy, Maximize, Minimize, Plus, Trash2, X } from "lucide-react";
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

/**
 * Một dòng khai báo — ĐỘC LẬP hoàn toàn với các dòng khác.
 *
 * Sáu ô ghép khoá + khoảng thời gian + 14 ô giá trị đều thuộc về đúng MỘT
 * dòng. Không có khái niệm "một khoá, nhiều khoảng thời gian dùng chung" —
 * bấm "+" chỉ COPY dòng hiện tại thành một dòng mới độc lập, không ràng
 * buộc hai dòng phải cùng khoá.
 */
interface Entry {
  id: number;
  seamGroup: string;
  benchGroup: string;
  excavator: string;
  mudMark: string;
  excavationArea: string;
  suffix: string;
  /** Khoá đã ghép — luôn tính ở BACKEND, không tự ghép ở đây (xem doc đầu file). */
  composedKey: string;
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

const emptyEntry = (from: string, to: string, nextId: () => number): Entry => ({
  id: nextId(),
  seamGroup: "",
  benchGroup: "",
  excavator: "",
  mudMark: "",
  excavationArea: "",
  suffix: "",
  composedKey: "",
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

const KEY_FIELDS = ["seamGroup", "benchGroup", "excavator", "mudMark", "excavationArea", "suffix"] as const;

const currentYear = new Date().getFullYear();

/** yyyy-MM-dd, tính theo UTC-nửa đêm để tránh lệch ngày do múi giờ máy khách. */
const parseISO = (s: string) => new Date(`${s}T00:00:00Z`);
const toISO = (d: Date) => d.toISOString().slice(0, 10);
const ONE_DAY_MS = 86_400_000;

const numOrNull = (s: string): number | null => {
  const t = s.trim();
  return t === "" ? null : Number(t.replace(",", "."));
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
 * dòng, và khoá được ghép sống — gõ đến đâu, cột "Khoá" hiện ra đến đó.
 *
 * <b>Khoá luôn ghép ở BACKEND</b> (gọi {@code POST /survey-standards/build-key}),
 * không tự ghép ở đây: đây chính là hàm engine tính sản lượng dùng để suy
 * khoá của mỗi chuyến — ghép lệch dù chỉ một dấu gạch dưới thì dòng danh
 * mục sẽ không bao giờ khớp, và triệu chứng là "thiếu dữ liệu STD" chứ
 * không phải một lỗi rõ ràng.
 *
 * <b>Mỗi dòng ĐỘC LẬP hoàn toàn</b> — không có khái niệm "một khoá dùng
 * chung cho nhiều khoảng thời gian". Nút "+" COPY dòng hiện tại (cả sáu ô
 * khoá lẫn 14 ô giá trị) thành một dòng mới ngay bên dưới, với khoảng thời
 * gian chia đôi phần còn lại — người dùng sửa tiếp từ đó, kể cả đổi hẳn
 * sang máy xúc/khu vực khác nếu dòng mới thật ra là một khoá khác. Muốn
 * một dòng hoàn toàn trống thì bấm "Thêm dòng mới" ở cuối bảng.
 *
 * Lưu xuống PHẲNG: mỗi dòng trên màn hình là một bản ghi
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
  const [entries, setEntries] = useState<Entry[]>([]);
  const [seamGroups, setSeamGroups] = useState<NamedOption[]>([]);
  const [excavationAreas, setExcavationAreas] = useState<NamedOption[]>([]);
  const [excavators, setExcavators] = useState<NamedOption[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const entryIdRef = useRef(0);
  const nextEntryId = () => ++entryIdRef.current;

  // batchFrom/batchTo đổi không được kéo lùi ngày của các dòng ĐÃ có — chỉ
  // dòng MỚI thêm sau đó mới dùng khoảng mặc định hiện tại.
  const batchRef = useRef({ batchFrom, batchTo });
  batchRef.current = { batchFrom, batchTo };

  // Nạp lại từ đầu mỗi lần mở — đóng rồi mở lại coi như một lượt khai mới.
  useEffect(() => {
    if (!open) return;
    setBatchFrom(`${currentYear}-01-01`);
    setBatchTo(`${currentYear}-12-31`);
    setEntries([emptyEntry(`${currentYear}-01-01`, `${currentYear}-12-31`, nextEntryId)]);
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

  // Ghép khoá SỐNG cho mọi dòng — gọi backend mỗi khi sáu ô khoá của dòng
  // nào đó đổi. Debounce 300ms để không gọi dồn dập lúc đang gõ.
  const keySignature = JSON.stringify(
    entries.map((e) => KEY_FIELDS.map((f) => e[f])),
  );
  useEffect(() => {
    if (!open || entries.length === 0) return;
    const timer = setTimeout(async () => {
      const updated = await Promise.all(
        entries.map(async (e) => {
          const { seamGroup, benchGroup, excavator, mudMark, excavationArea, suffix } = e;
          if (!seamGroup && !benchGroup && !excavator && !mudMark && !excavationArea && !suffix) {
            return { ...e, composedKey: "" };
          }
          try {
            const res = await api.post("/survey-standards/build-key", {
              seamGroup, benchGroup, excavator, mudMark, excavationArea, suffix,
            });
            return { ...e, composedKey: res.data?.data?.key ?? "" };
          } catch {
            return { ...e, composedKey: "" };
          }
        }),
      );
      setEntries(updated);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, keySignature]);

  if (!open) return null;

  const addEntry = () =>
    setEntries((prev) => [
      ...prev,
      emptyEntry(batchRef.current.batchFrom, batchRef.current.batchTo, nextEntryId),
    ]);

  const removeEntry = (id: number) =>
    setEntries((prev) => (prev.length === 1 ? prev : prev.filter((e) => e.id !== id)));

  const setField = (id: number, field: keyof Omit<Entry, "id">, value: string) =>
    setEntries((prev) => prev.map((e) => (e.id !== id ? e : { ...e, [field]: value })));

  /**
   * "+" — COPY dòng hiện tại thành một dòng MỚI ĐỘC LẬP ngay bên dưới:
   * chia đôi khoảng thời gian còn lại của dòng gốc, dòng mới kế thừa cả
   * sáu ô khoá lẫn 14 ô giá trị làm điểm bắt đầu — sửa tiếp từ đó, kể cả
   * đổi hẳn máy xúc/khu vực nếu dòng mới thực ra là một khoá khác.
   */
  const duplicateEntry = (id: number) =>
    setEntries((prev) => {
      const idx = prev.findIndex((e) => e.id === id);
      if (idx === -1) return prev;
      const source = prev[idx];
      const fromMs = parseISO(source.effectiveFrom).getTime();
      const toMs = parseISO(source.effectiveTo).getTime();
      const totalDays = Math.round((toMs - fromMs) / ONE_DAY_MS);
      if (!(totalDays > 0)) {
        toast.error("Khoảng thời gian này chỉ có 1 ngày, không tách được.");
        return prev;
      }
      const midMs = fromMs + Math.floor(totalDays / 2) * ONE_DAY_MS;
      const firstTo = toISO(new Date(midMs));
      const secondFrom = toISO(new Date(midMs + ONE_DAY_MS));
      const updatedSource: Entry = { ...source, effectiveTo: firstTo };
      const copy: Entry = {
        ...source,
        id: nextEntryId(),
        effectiveFrom: secondFrom,
        effectiveTo: source.effectiveTo,
      };
      const next = [...prev];
      next.splice(idx, 1, updatedSource, copy);
      return next;
    });

  const validate = (): string | null => {
    if (entries.length === 0) return "Chưa có dòng nào.";
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      if (!e.composedKey.trim()) {
        return `Dòng ${i + 1}: chưa đủ thông tin để ghép khoá "Nhóm vỉa + Máy xúc".`;
      }
      if (!e.effectiveFrom || !e.effectiveTo) {
        return `Dòng ${i + 1}: chưa chọn đủ ngày.`;
      }
      if (e.effectiveFrom > e.effectiveTo) {
        return `Dòng ${i + 1}: "Từ ngày" phải trước "Đến ngày".`;
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
      const payloads: Omit<SurveyStandardPayload, "id">[] = entries.map((e) => ({
        catalogType: "DAT_SX_THAN_SX",
        seamGroupExcavatorKey: e.composedKey,
        effectiveFrom: e.effectiveFrom,
        effectiveTo: e.effectiveTo,
        earthAcceptanceProduct: "Đất SX",
        earthM3: numOrNull(e.earthM3),
        earthDesignVolume: numOrNull(e.earthDesignVolume),
        earthDeviation: numOrNull(e.earthDeviation),
        earthTon: numOrNull(e.earthTon),
        earthHaulDistance: numOrNull(e.earthHaulDistance),
        earthBulkDensity: numOrNull(e.earthBulkDensity),
        earthTkm: numOrNull(e.earthTkm),
        coalAcceptanceProduct: "Than SX",
        coalM3: numOrNull(e.coalM3),
        coalBulkDensity: numOrNull(e.coalBulkDensity),
        coalTon: numOrNull(e.coalTon),
        coalDesignVolume: numOrNull(e.coalDesignVolume),
        coalDeviation: numOrNull(e.coalDeviation),
        coalHaulDistance: numOrNull(e.coalHaulDistance),
        coalTkm: numOrNull(e.coalTkm),
        note: e.note.trim() || null,
      }));
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

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/40 ${isFullscreen ? "" : "p-4"}`}
    >
      <div
        className={
          isFullscreen
            ? "flex h-screen w-screen flex-col overflow-hidden bg-white dark:bg-gray-900"
            : "flex max-h-[90vh] w-full max-w-[1700px] flex-col overflow-hidden rounded-xl bg-white shadow-xl dark:bg-gray-900"
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
              Khoảng mặc định cho dòng thêm mới — dòng đã có giữ nguyên thời gian đã sửa.
            </p>
          </div>

          <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
            Tổng số{" "}
            <span className="font-semibold text-blue-700 dark:text-blue-400">
              STD (Đất SX/Than SX): {entries.length}
            </span>
          </p>

          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="w-full min-w-[2050px] border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-900 text-center text-xs font-bold text-gray-800 dark:text-gray-100">
                  <th rowSpan={2} className="w-16 border-b border-r border-gray-200 dark:border-gray-700 px-2 py-2 align-middle">
                    #
                  </th>
                  <th rowSpan={2} className="border-b border-r border-gray-200 dark:border-gray-700 px-2 py-2 align-middle min-w-[210px]">
                    Thời gian
                  </th>
                  <th colSpan={6} className="border-b border-r border-gray-200 dark:border-gray-700 px-2 py-2">
                    Nhóm vỉa + Máy xúc
                  </th>
                  <th rowSpan={2} className="border-b border-r border-gray-200 dark:border-gray-700 px-2 py-2 align-middle min-w-[190px]">
                    Khoá
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
                {entries.map((e, i) => (
                  <EntryRow
                    key={e.id}
                    entry={e}
                    index={i}
                    seamGroups={seamGroups}
                    excavationAreas={excavationAreas}
                    excavators={excavators}
                    canRemove={entries.length > 1}
                    onRemove={() => removeEntry(e.id)}
                    onDuplicate={() => duplicateEntry(e.id)}
                    onFieldChange={(field, value) => setField(e.id, field, value)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={addEntry}
            className="mt-3 gap-1.5 text-sm text-blue-700 hover:bg-blue-50 dark:text-blue-400"
          >
            <Plus className="h-4 w-4" />
            Thêm dòng mới (trống)
          </Button>

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

function EntryRow({
  entry,
  index,
  seamGroups,
  excavationAreas,
  excavators,
  canRemove,
  onRemove,
  onDuplicate,
  onFieldChange,
}: {
  entry: Entry;
  index: number;
  seamGroups: NamedOption[];
  excavationAreas: NamedOption[];
  excavators: NamedOption[];
  canRemove: boolean;
  onRemove: () => void;
  onDuplicate: () => void;
  onFieldChange: (field: keyof Omit<Entry, "id">, value: string) => void;
}) {
  const zebra = index % 2 === 0 ? "bg-white dark:bg-gray-950" : "bg-gray-50/50 dark:bg-gray-900/40";
  const cellCls = "border-b border-r border-gray-200 dark:border-gray-700 px-2 py-1.5";

  return (
    <tr className={zebra}>
      <td className={`${cellCls} text-center align-top`}>
        <div className="flex items-center justify-center gap-1 pt-1">
          <span className="font-semibold text-gray-500">{index + 1}</span>
          <button
            onClick={onDuplicate}
            title="Chép dòng này thành dòng mới, chia đôi khoảng thời gian còn lại"
            className="rounded p-0.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/30"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>

      <td className={`${cellCls} align-top`}>
        <div className="flex items-center gap-1">
          <Input
            type="date"
            value={entry.effectiveFrom}
            onChange={(e) => onFieldChange("effectiveFrom", e.target.value)}
            className="h-9 text-xs"
          />
          <span className="text-gray-400">–</span>
          <Input
            type="date"
            value={entry.effectiveTo}
            onChange={(e) => onFieldChange("effectiveTo", e.target.value)}
            className="h-9 text-xs"
          />
        </div>
      </td>

      <td className={`${cellCls} align-top min-w-[110px]`}>
        <select
          value={entry.seamGroup}
          onChange={(e) => onFieldChange("seamGroup", e.target.value)}
          className="h-9 w-full rounded-md border bg-transparent px-1.5 text-xs"
        >
          <option value="">—</option>
          {seamGroups.map((s) => (
            <option key={s.id} value={s.code}>{s.name}</option>
          ))}
        </select>
      </td>
      <td className={`${cellCls} align-top`}>
        <Input
          type="number"
          step="any"
          value={entry.benchGroup}
          onChange={(e) => onFieldChange("benchGroup", e.target.value)}
          placeholder="75"
          className="h-9 text-xs"
        />
      </td>
      <td className={`${cellCls} align-top`}>
        <select
          value={entry.excavator}
          onChange={(e) => onFieldChange("excavator", e.target.value)}
          className="h-9 w-full rounded-md border bg-transparent px-1.5 text-xs"
        >
          <option value="">—</option>
          {excavators.map((m) => (
            <option key={m.id} value={m.code}>{m.code}</option>
          ))}
        </select>
      </td>
      <td className={`${cellCls} align-top`}>
        <Input
          value={entry.mudMark}
          onChange={(e) => onFieldChange("mudMark", e.target.value)}
          placeholder="vd Bun"
          className="h-9 text-xs"
        />
      </td>
      <td className={`${cellCls} align-top`}>
        <select
          value={entry.excavationArea}
          onChange={(e) => onFieldChange("excavationArea", e.target.value)}
          className="h-9 w-full rounded-md border bg-transparent px-1.5 text-xs"
        >
          <option value="">—</option>
          {excavationAreas.map((a) => (
            <option key={a.id} value={a.code}>{a.name}</option>
          ))}
        </select>
      </td>
      <td className={`${cellCls} align-top`}>
        <Input
          value={entry.suffix}
          onChange={(e) => onFieldChange("suffix", e.target.value)}
          placeholder="vd BK"
          className="h-9 text-xs"
        />
      </td>

      {/* Cột Khoá — luôn hiện ngay cạnh sáu ô ghép, không phải cuộn ngang mới thấy */}
      <td className={`${cellCls} align-top`}>
        <span className="break-all font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
          {entry.composedKey || (
            <span className="font-sans italic font-normal text-gray-400">(chưa đủ thông tin)</span>
          )}
        </span>
      </td>

      <NumCell value={entry.earthM3} onChange={(v) => onFieldChange("earthM3", v)} />
      <NumCell value={entry.earthDesignVolume} onChange={(v) => onFieldChange("earthDesignVolume", v)} />
      <NumCell value={entry.earthDeviation} onChange={(v) => onFieldChange("earthDeviation", v)} />
      <NumCell value={entry.earthTon} onChange={(v) => onFieldChange("earthTon", v)} />
      <NumCell value={entry.earthHaulDistance} onChange={(v) => onFieldChange("earthHaulDistance", v)} />
      <NumCell value={entry.earthBulkDensity} onChange={(v) => onFieldChange("earthBulkDensity", v)} />
      <NumCell value={entry.earthTkm} onChange={(v) => onFieldChange("earthTkm", v)} />

      <NumCell value={entry.coalM3} onChange={(v) => onFieldChange("coalM3", v)} />
      <NumCell value={entry.coalBulkDensity} onChange={(v) => onFieldChange("coalBulkDensity", v)} />
      <NumCell value={entry.coalTon} onChange={(v) => onFieldChange("coalTon", v)} />
      <NumCell value={entry.coalDesignVolume} onChange={(v) => onFieldChange("coalDesignVolume", v)} />
      <NumCell value={entry.coalDeviation} onChange={(v) => onFieldChange("coalDeviation", v)} />
      <NumCell value={entry.coalHaulDistance} onChange={(v) => onFieldChange("coalHaulDistance", v)} />
      <NumCell value={entry.coalTkm} onChange={(v) => onFieldChange("coalTkm", v)} />

      <td className={cellCls}>
        <Input
          value={entry.note}
          onChange={(e) => onFieldChange("note", e.target.value)}
          className="h-9 text-xs"
        />
      </td>
      <td className="border-b border-gray-200 dark:border-gray-700 px-1.5 py-1.5 text-center">
        {canRemove && (
          <button
            onClick={onRemove}
            title="Xoá dòng này"
            className="rounded p-1 text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </td>
    </tr>
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
