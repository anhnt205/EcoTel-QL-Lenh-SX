import { useEffect, useRef, useState } from "react";
import { Copy, Maximize, Minimize, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import api from "@/config/api.config";
import { createCatalogService } from "../catalogService";
import { formatStdCode, type SurveyStandardResponse } from "./types";

interface NamedOption {
  id: number;
  code: string;
  name: string;
}

type StdCatalogType = "DAT_CN" | "DAT_SX_THAN_SX";

/**
 * Hai màn STD dùng CHUNG modal này — chỉ khác nhãn khối "Đất" và có/không
 * khối "Than SX". Gom vào một bảng tra thay vì hai file gần như trùng nhau
 * để sửa một chỗ (vd luồng lưu, sinh khoá sống) tự áp dụng cho cả hai, không
 * còn nguy cơ sửa một bên quên sửa bên kia.
 */
const STD_VARIANTS: Record<StdCatalogType, { title: string; earthLabel: string; hasCoal: boolean }> = {
  DAT_CN: { title: "STD (Đất CN)", earthLabel: "Đất CN", hasCoal: false },
  DAT_SX_THAN_SX: { title: "STD (Đất SX/Than SX)", earthLabel: "Đất SX", hasCoal: true },
};

const BASE_PATH = "/survey-standards";

/** Payload gửi lên — khớp `SurveyStandardRequest` phía backend. */
interface SurveyStandardPayload {
  id?: number;
  catalogType: StdCatalogType;
  seamGroupExcavatorKey: string;
  /** Sáu thành phần đã ghép nên khoá — chỉ để Xem/Sửa hiện lại đúng, không dùng để tra cứu. */
  seamGroup: string | null;
  benchGroup: string | null;
  excavator: string | null;
  mudMark: string | null;
  excavationArea: string | null;
  suffix: string | null;
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
  /**
   * Id bản ghi GỐC nếu dòng này nạp từ một bản ghi đã lưu — `undefined` nếu
   * là dòng MỚI (thêm dòng, hoặc chép từ dòng khác trong lúc sửa).
   *
   * Quyết định cách lưu ở `handleSubmit`: có `originalId` thì SỬA TẠI CHỖ
   * (giữ nguyên id, nên mã quản lý ở {@link formatStdCode} không đổi dù
   * sửa gì); không có thì TẠO MỚI. Mất hẳn khỏi danh sách khi lưu (người
   * dùng bấm xoá dòng) thì id đó bị XOÁ. Xem doc `handleSubmit`.
   */
  originalId?: number;
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

/**
 * Dựng lại một Entry từ bản ghi đã lưu — dùng cho "view"/"edit".
 *
 * Sáu thành phần đọc THẲNG từ bản ghi (backend lưu riêng từ lúc tạo, không
 * chỉ lưu chuỗi khoá đã ghép — xem model `SurveyStandard`), nên Xem/Sửa
 * hiện đúng "Nhóm vỉa + Máy xúc" đã khai VÀ sửa lại được qua đúng sáu ô đó
 * — không còn phải xoá dòng rồi thêm dòng mới chỉ để sửa một chữ.
 *
 * Bản ghi CŨ khai qua ô gõ tự do trước đây (hoặc STD Đất CN) không có sáu
 * cột này — về "" là bình thường; gõ lại từ đầu vào sáu ô đó cũng ghép ra
 * khoá đúng như mọi dòng khác.
 */
const entryFromRecord = (r: SurveyStandardResponse, nextId: () => number): Entry => ({
  id: nextId(),
  seamGroup: r.seamGroup ?? "",
  benchGroup: r.benchGroup ?? "",
  excavator: r.excavator ?? "",
  mudMark: r.mudMark ?? "",
  excavationArea: r.excavationArea ?? "",
  suffix: r.suffix ?? "",
  composedKey: r.seamGroupExcavatorKey,
  originalId: r.id,
  effectiveFrom: r.effectiveFrom,
  effectiveTo: r.effectiveTo,
  earthM3: r.earthM3 != null ? String(r.earthM3) : "",
  earthDesignVolume: r.earthDesignVolume != null ? String(r.earthDesignVolume) : "",
  earthDeviation: r.earthDeviation != null ? String(r.earthDeviation) : "",
  earthTon: r.earthTon != null ? String(r.earthTon) : "",
  earthHaulDistance: r.earthHaulDistance != null ? String(r.earthHaulDistance) : "",
  earthBulkDensity: r.earthBulkDensity != null ? String(r.earthBulkDensity) : "",
  earthTkm: r.earthTkm != null ? String(r.earthTkm) : "",
  coalM3: r.coalM3 != null ? String(r.coalM3) : "",
  coalBulkDensity: r.coalBulkDensity != null ? String(r.coalBulkDensity) : "",
  coalTon: r.coalTon != null ? String(r.coalTon) : "",
  coalDesignVolume: r.coalDesignVolume != null ? String(r.coalDesignVolume) : "",
  coalDeviation: r.coalDeviation != null ? String(r.coalDeviation) : "",
  coalHaulDistance: r.coalHaulDistance != null ? String(r.coalHaulDistance) : "",
  coalTkm: r.coalTkm != null ? String(r.coalTkm) : "",
  note: r.note ?? "",
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

const formatVN = (s: string) => {
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
};

const service = createCatalogService<SurveyStandardPayload>(BASE_PATH);

/**
 * Modal "Thêm mới STD" — thiết kế riêng, thay cho modal chung
 * `CatalogFormModal` ở chế độ thêm mới cho đúng hai màn STD (Đất CN) và
 * STD (Đất SX/Than SX). Dùng CHUNG một modal (phân biệt bằng prop
 * `catalogType`, xem {@link STD_VARIANTS}) thay vì hai file gần như trùng
 * nhau — hai màn khác nhau đúng một chỗ: STD (Đất CN) chỉ có một khối giá
 * trị "Đất CN", STD (Đất SX/Than SX) có thêm khối "Than SX".
 *
 * <b>Khác biệt cốt lõi so với trước:</b> trước đây ô "Nhóm vỉa + Máy xúc" là
 * MỘT Ô GÕ TỰ DO — người dùng phải mở một hộp thoại "Dựng khoá" riêng, chép
 * chuỗi kết quả, rồi dán tay vào ô đó (xem {@link ../std/SeamGroupKeyBuilder},
 * không còn dùng ở màn nào nữa). Ở đây SÁU thành phần của khoá nằm NGAY trên
 * dòng, và khoá được ghép sống — gõ đến đâu, cột "Khoá" hiện ra đến đó.
 *
 * <b>Khoá luôn ghép ở BACKEND</b> (gọi {@code POST /survey-standards/build-key}),
 * không tự ghép ở đây: đây chính là hàm engine tính sản lượng dùng để suy
 * khoá của mỗi chuyến — ghép lệch dù chỉ một dấu gạch dưới thì dòng danh
 * mục sẽ không bao giờ khớp, và triệu chứng là "thiếu dữ liệu STD" chứ
 * không phải một lỗi rõ ràng. Hậu tố là Ô GÕ TỰ DO (không lọc qua danh sách
 * bốn hậu tố hợp lệ) ở CẢ HAI màn — engine tự suy hậu tố từ dữ liệu chuyến
 * theo đúng thuật toán chung (`SeamGroupExcavatorKeys.deriveSuffixes`),
 * không phân biệt catalogType, nên gõ đúng hậu tố hợp lệ vẫn khớp được lúc
 * tính sản lượng ở cả hai màn.
 *
 * <b>Mỗi dòng ĐỘC LẬP hoàn toàn</b> — không có khái niệm "một khoá dùng
 * chung cho nhiều khoảng thời gian". Nút "+" COPY dòng hiện tại (cả sáu ô
 * khoá lẫn các ô giá trị) thành một dòng mới ngay bên dưới, với khoảng thời
 * gian chia đôi phần còn lại — người dùng sửa tiếp từ đó, kể cả đổi hẳn
 * sang máy xúc/khu vực khác nếu dòng mới thật ra là một khoá khác. Muốn
 * một dòng hoàn toàn trống thì bấm "Thêm dòng mới" ở cuối bảng.
 *
 * Lưu xuống PHẲNG: mỗi dòng trên màn hình là một bản ghi
 * `SurveyStandardRequest` riêng, gửi qua `/survey-standards/bulk`.
 */
export function SurveyStandardAddModal({
  open,
  catalogType,
  mode = "create",
  records,
  onClose,
  onSaved,
}: {
  open: boolean;
  /** Quyết định nhãn khối "Đất" và có/không khối "Than SX" — xem {@link STD_VARIANTS}. */
  catalogType: StdCatalogType;
  /** "create" thêm mới trống · "view" chỉ xem · "edit" sửa các bản ghi đã có. */
  mode?: "create" | "view" | "edit";
  /** Bản ghi hiện có — bắt buộc khi `mode` là "view"/"edit", bỏ trống khi "create". */
  records?: SurveyStandardResponse[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isReadOnly = mode === "view";
  const variant = STD_VARIANTS[catalogType];

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

  // Id các bản ghi GỐC — dùng để xoá khi "Lưu thay đổi" ở chế độ sửa (xem
  // handleSubmit). Chụp lại đúng lúc mở, không đổi theo entries về sau.
  const originalIdsRef = useRef<number[]>([]);

  // batchFrom/batchTo đổi không được kéo lùi ngày của các dòng ĐÃ có — chỉ
  // dòng MỚI thêm sau đó mới dùng khoảng mặc định hiện tại.
  const batchRef = useRef({ batchFrom, batchTo });
  batchRef.current = { batchFrom, batchTo };

  // Nạp lại từ đầu mỗi lần mở. "view"/"edit" nạp từ các bản ghi truyền vào;
  // "create" nạp trống — đóng rồi mở lại coi như một lượt khai mới.
  useEffect(() => {
    if (!open) return;
    setError(null);
    setBatchFrom(`${currentYear}-01-01`);
    setBatchTo(`${currentYear}-12-31`);
    if (records && records.length > 0) {
      originalIdsRef.current = records.map((r) => r.id);
      setEntries(records.map((r) => entryFromRecord(r, nextEntryId)));
    } else {
      originalIdsRef.current = [];
      setEntries([emptyEntry(`${currentYear}-01-01`, `${currentYear}-12-31`, nextEntryId)]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, records]);

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
            // Sáu ô trống KHÔNG có nghĩa "chưa có khoá": dòng nạp từ bản ghi
            // CŨ (khai qua ô gõ tự do trước đây, không có sáu cột riêng) vẫn
            // để trống cả sáu ô nhưng đã có sẵn khoá — giữ nguyên khoá đó
            // thay vì xoá mất. Dòng mới tạo thì composedKey rỗng sẵn nên giữ
            // nguyên cũng đúng.
            return e;
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
        // KHÔNG kế thừa originalId: đây là dòng MỚI, chưa gắn với bản ghi
        // nào — hai dòng cùng trỏ một originalId sẽ đụng nhau lúc lưu (cả
        // hai cùng cố UPDATE một id).
        originalId: undefined,
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
      const toPayload = (e: Entry): Omit<SurveyStandardPayload, "id"> => ({
        catalogType,
        seamGroupExcavatorKey: e.composedKey,
        seamGroup: e.seamGroup || null,
        benchGroup: e.benchGroup || null,
        excavator: e.excavator || null,
        mudMark: e.mudMark || null,
        excavationArea: e.excavationArea || null,
        suffix: e.suffix || null,
        effectiveFrom: e.effectiveFrom,
        effectiveTo: e.effectiveTo,
        earthAcceptanceProduct: variant.earthLabel,
        earthM3: numOrNull(e.earthM3),
        earthDesignVolume: numOrNull(e.earthDesignVolume),
        earthDeviation: numOrNull(e.earthDeviation),
        earthTon: numOrNull(e.earthTon),
        earthHaulDistance: numOrNull(e.earthHaulDistance),
        earthBulkDensity: numOrNull(e.earthBulkDensity),
        earthTkm: numOrNull(e.earthTkm),
        // Khối Than chỉ có nghĩa ở STD (Đất SX/Than SX) — backend cũng tự
        // null hoá cột này khi catalogType không phải DAT_SX_THAN_SX (xem
        // `SurveyStandardService#build`), gửi rỗng ở đây cho đúng ý nghĩa.
        coalAcceptanceProduct: variant.hasCoal ? "Than SX" : "",
        coalM3: numOrNull(e.coalM3),
        coalBulkDensity: numOrNull(e.coalBulkDensity),
        coalTon: numOrNull(e.coalTon),
        coalDesignVolume: numOrNull(e.coalDesignVolume),
        coalDeviation: numOrNull(e.coalDeviation),
        coalHaulDistance: numOrNull(e.coalHaulDistance),
        coalTkm: numOrNull(e.coalTkm),
        note: e.note.trim() || null,
      });

      if (mode === "edit") {
        // Sửa TẠI CHỖ cho dòng có `originalId` (giữ nguyên id — mã quản lý
        // ở formatStdCode không đổi), TẠO MỚI cho dòng không có, XOÁ những
        // id gốc không còn dòng nào trong danh sách nhận nữa (người dùng đã
        // bấm xoá dòng đó lúc sửa). KHÔNG dùng "xoá hết rồi tạo lại cả lô"
        // nữa: cách đó sinh id MỚI cho mọi dòng, kể cả dòng không đổi gì —
        // đúng bug chủ dự án vừa phát hiện, mã quản lý coi như vô nghĩa vì
        // đổi theo mỗi lần sửa. `update()` an toàn để giữ nguyên khoá+ngày
        // vì backend loại trừ CHÍNH bản ghi đang sửa khỏi kiểm tra chồng
        // lấn (tham số `selfId` — xem `SurveyStandardService#build`).
        //
        // Thứ tự bắt buộc: XOÁ trước, rồi mới SỬA/TẠO. Ví dụ dòng bị xoá lúc
        // sửa (bấm Xoá dòng này) để lại một dòng MỚI (từ "+") trùng khoá +
        // đè lên đúng khoảng ngày dòng cũ đang chiếm — tạo trước khi xoá sẽ
        // bị kiểm tra chồng lấn chặn nhầm vì dòng cũ vẫn còn trong DB lúc đó
        // (đã tự phát hiện lúc kiểm thử sống, xem `SurveyStandardService#build`).
        const kept = new Set(
          entries.map((e) => e.originalId).filter((id): id is number => id != null),
        );
        const toDelete = originalIdsRef.current.filter((id) => !kept.has(id));

        if (toDelete.length > 0) {
          await service.bulkRemove(toDelete);
        }
        for (const e of entries) {
          if (e.originalId != null) {
            await service.update(e.originalId, toPayload(e));
          }
        }
        const newPayloads = entries.filter((e) => e.originalId == null).map(toPayload);
        if (newPayloads.length > 0) {
          await service.bulkCreate(newPayloads);
        }
        toast.success(`Đã lưu ${entries.length} dòng ${variant.title}.`);
      } else {
        const payloads = entries.map(toPayload);
        await service.bulkCreate(payloads);
        toast.success(`Đã thêm ${payloads.length} dòng ${variant.title}.`);
      }
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
              {mode === "view"
                ? `Chi tiết ${variant.title}`
                : mode === "edit"
                  ? `Sửa ${variant.title}`
                  : `Thêm mới ${variant.title}`}
              {records?.length === 1 && (
                <span className="ml-2 font-mono text-sm font-semibold text-gray-400">
                  {formatStdCode(records[0].id)}
                </span>
              )}
            </h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {mode === "view"
                ? "Xem lại — bấm nút Sửa ở bảng danh mục nếu cần chỉnh."
                : mode === "edit"
                  ? "Sửa xong bấm Lưu thay đổi — hệ thay toàn bộ các dòng này bằng dữ liệu mới."
                  : `Có thể thêm nhiều dòng ${variant.title} và lưu một lần`}
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
          {/* Thời gian mặc định — chỉ áp cho dòng MỚI thêm sau đó, không cần khi chỉ xem */}
          {!isReadOnly && (
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
          )}

          <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
            Tổng số{" "}
            <span className="font-semibold text-blue-700 dark:text-blue-400">
              {variant.title}: {entries.length}
            </span>
          </p>

          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className={`w-full border-collapse text-sm ${variant.hasCoal ? "min-w-[2050px]" : "min-w-[1350px]"}`}>
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
                    {variant.earthLabel}
                  </th>
                  {variant.hasCoal && (
                    <th colSpan={7} className="border-b border-r border-gray-200 dark:border-gray-700 px-2 py-2">
                      Than SX
                    </th>
                  )}
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
                  <th className="border-b border-r border-gray-200 dark:border-gray-700 px-2 py-1.5 min-w-[100px]">{variant.earthLabel} (m3)</th>
                  <th className="border-b border-r border-gray-200 dark:border-gray-700 px-2 py-1.5 min-w-[90px]">V Tke</th>
                  <th className="border-b border-r border-gray-200 dark:border-gray-700 px-2 py-1.5 min-w-[90px]">Clech</th>
                  <th className="border-b border-r border-gray-200 dark:border-gray-700 px-2 py-1.5 min-w-[100px]">{variant.earthLabel} (tấn)</th>
                  <th className="border-b border-r border-gray-200 dark:border-gray-700 px-2 py-1.5 min-w-[90px]">CD đất</th>
                  <th className="border-b border-r border-gray-200 dark:border-gray-700 px-2 py-1.5 min-w-[120px]">Thể trọng đất (TĐ)</th>
                  <th className="border-b border-r border-gray-200 dark:border-gray-700 px-2 py-1.5 min-w-[100px]">{variant.earthLabel} (tkm)</th>
                  {variant.hasCoal && (
                    <>
                      <th className="border-b border-r border-gray-200 dark:border-gray-700 px-2 py-1.5 min-w-[100px]">Than SX (m3)</th>
                      <th className="border-b border-r border-gray-200 dark:border-gray-700 px-2 py-1.5 min-w-[120px]">Thể trọng than (TĐ)</th>
                      <th className="border-b border-r border-gray-200 dark:border-gray-700 px-2 py-1.5 min-w-[100px]">Than SX (tấn)</th>
                      <th className="border-b border-r border-gray-200 dark:border-gray-700 px-2 py-1.5 min-w-[90px]">Q Tke</th>
                      <th className="border-b border-r border-gray-200 dark:border-gray-700 px-2 py-1.5 min-w-[90px]">Clech</th>
                      <th className="border-b border-r border-gray-200 dark:border-gray-700 px-2 py-1.5 min-w-[90px]">CD than</th>
                      <th className="border-b border-r border-gray-200 dark:border-gray-700 px-2 py-1.5 min-w-[100px]">Than SX (Tkm)</th>
                    </>
                  )}
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
                    readOnly={isReadOnly}
                    hasCoal={variant.hasCoal}
                    canRemove={entries.length > 1}
                    onRemove={() => removeEntry(e.id)}
                    onDuplicate={() => duplicateEntry(e.id)}
                    onFieldChange={(field, value) => setField(e.id, field, value)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {!isReadOnly && (
            <Button
              variant="ghost"
              size="sm"
              onClick={addEntry}
              className="mt-3 gap-1.5 text-sm text-blue-700 hover:bg-blue-50 dark:text-blue-400"
            >
              <Plus className="h-4 w-4" />
              Thêm dòng mới (trống)
            </Button>
          )}

          {error && (
            <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </p>
          )}
        </div>

        {/* Chân */}
        <div className="flex justify-end gap-3 border-t border-gray-200 dark:border-gray-800 px-6 py-4">
          {isReadOnly ? (
            <Button variant="outline" onClick={onClose}>
              Đóng
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={onClose} disabled={submitting}>
                Huỷ
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-blue-600 font-semibold text-white hover:bg-blue-700"
              >
                {submitting
                  ? "Đang lưu..."
                  : mode === "edit"
                    ? "Lưu thay đổi"
                    : "Xác nhận"}
              </Button>
            </>
          )}
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
  readOnly,
  hasCoal,
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
  readOnly: boolean;
  hasCoal: boolean;
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
          {!readOnly && (
            <button
              onClick={onDuplicate}
              title="Chép dòng này thành dòng mới, chia đôi khoảng thời gian còn lại"
              className="rounded p-0.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/30"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </td>

      <td className={`${cellCls} align-top`}>
        {readOnly ? (
          <span className="px-1 text-gray-700 dark:text-gray-300">
            {formatVN(entry.effectiveFrom)} – {formatVN(entry.effectiveTo)}
          </span>
        ) : (
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
        )}
      </td>

      {readOnly ? (
        <>
          <LockedCell value={seamGroups.find((s) => s.code === entry.seamGroup)?.name || entry.seamGroup} />
          <LockedCell value={entry.benchGroup} />
          <LockedCell value={entry.excavator} />
          <LockedCell value={entry.mudMark} />
          <LockedCell
            value={excavationAreas.find((a) => a.code === entry.excavationArea)?.name || entry.excavationArea}
          />
          <LockedCell value={entry.suffix} />
        </>
      ) : (
        <>
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
        </>
      )}

      {/* Cột Khoá — luôn hiện ngay cạnh sáu ô ghép, không phải cuộn ngang mới thấy */}
      <td className={`${cellCls} align-top`}>
        <span className="break-all font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
          {entry.composedKey || (
            <span className="font-sans italic font-normal text-gray-400">(chưa đủ thông tin)</span>
          )}
        </span>
      </td>

      <NumCell readOnly={readOnly} value={entry.earthM3} onChange={(v) => onFieldChange("earthM3", v)} />
      <NumCell readOnly={readOnly} value={entry.earthDesignVolume} onChange={(v) => onFieldChange("earthDesignVolume", v)} />
      <NumCell readOnly={readOnly} value={entry.earthDeviation} onChange={(v) => onFieldChange("earthDeviation", v)} />
      <NumCell readOnly={readOnly} value={entry.earthTon} onChange={(v) => onFieldChange("earthTon", v)} />
      <NumCell readOnly={readOnly} value={entry.earthHaulDistance} onChange={(v) => onFieldChange("earthHaulDistance", v)} />
      <NumCell readOnly={readOnly} value={entry.earthBulkDensity} onChange={(v) => onFieldChange("earthBulkDensity", v)} />
      <NumCell readOnly={readOnly} value={entry.earthTkm} onChange={(v) => onFieldChange("earthTkm", v)} />

      {hasCoal && (
        <>
          <NumCell readOnly={readOnly} value={entry.coalM3} onChange={(v) => onFieldChange("coalM3", v)} />
          <NumCell readOnly={readOnly} value={entry.coalBulkDensity} onChange={(v) => onFieldChange("coalBulkDensity", v)} />
          <NumCell readOnly={readOnly} value={entry.coalTon} onChange={(v) => onFieldChange("coalTon", v)} />
          <NumCell readOnly={readOnly} value={entry.coalDesignVolume} onChange={(v) => onFieldChange("coalDesignVolume", v)} />
          <NumCell readOnly={readOnly} value={entry.coalDeviation} onChange={(v) => onFieldChange("coalDeviation", v)} />
          <NumCell readOnly={readOnly} value={entry.coalHaulDistance} onChange={(v) => onFieldChange("coalHaulDistance", v)} />
          <NumCell readOnly={readOnly} value={entry.coalTkm} onChange={(v) => onFieldChange("coalTkm", v)} />
        </>
      )}

      <td className={cellCls}>
        {readOnly ? (
          <span className="px-1 text-gray-500">{entry.note || "—"}</span>
        ) : (
          <Input
            value={entry.note}
            onChange={(e) => onFieldChange("note", e.target.value)}
            className="h-9 text-xs"
          />
        )}
      </td>
      <td className="border-b border-gray-200 dark:border-gray-700 px-1.5 py-1.5 text-center">
        {!readOnly && canRemove && (
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

function NumCell({
  value,
  onChange,
  readOnly,
}: {
  value: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
}) {
  return (
    <td className="border-b border-r border-gray-200 dark:border-gray-700 px-2 py-1.5">
      {readOnly ? (
        <span className="px-1">{value || "—"}</span>
      ) : (
        <Input
          type="number"
          step="any"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 text-xs"
        />
      )}
    </td>
  );
}

/** Một ô trong sáu ô ghép khoá khi bị khoá (Xem, hoặc Sửa một dòng đã lưu) — hiện giá trị THẬT, không sửa được. */
function LockedCell({ value }: { value: string }) {
  return (
    <td className="border-b border-r border-gray-200 dark:border-gray-700 px-2 py-1.5 align-top min-w-[100px]">
      <span className="px-1 text-gray-700 dark:text-gray-300">{value || "—"}</span>
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
