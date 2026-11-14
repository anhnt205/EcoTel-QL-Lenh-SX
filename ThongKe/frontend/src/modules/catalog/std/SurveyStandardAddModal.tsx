import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import api from "@/config/api.config";
import { createCatalogService } from "../catalogService";
import DIcon from "../design/DIcon";
import { ColResizer, TableLayoutButton, useTableLayout } from "../design/tableLayout";
import ViewGrid, { ColumnsMenuButton, type ViewColumn } from "../design/ViewGrid";
import { moveItem, useRowDnD } from "../design/useRowDnD";
import "@/styles/catalog-design.css";
import { formatStdCode, type SurveyStandardResponse } from "./types";
import { StdQuickImportDialog, type QuickRow } from "./StdQuickImportDialog";

interface NamedOption {
  id: number;
  code: string;
  name: string;
}

/** Một hậu tố trong danh mục Hậu tố. */
interface SuffixOption {
  id: number;
  suffix: string;
}

export type StdCatalogType = "DAT_CN" | "DAT_SX_THAN_SX";

/**
 * Hai màn STD dùng CHUNG modal này — chỉ khác nhãn khối "Đất" và có/không
 * khối "Than SX". Gom vào một bảng tra thay vì hai file gần như trùng nhau
 * để sửa một chỗ (vd luồng lưu, sinh khoá sống) tự áp dụng cho cả hai, không
 * còn nguy cơ sửa một bên quên sửa bên kia.
 */
export const STD_VARIANTS: Record<StdCatalogType, { title: string; earthLabel: string; hasCoal: boolean }> = {
  DAT_CN: { title: "STD (Đất CN)", earthLabel: "Đất CN", hasCoal: false },
  DAT_SX_THAN_SX: { title: "STD (Đất SX/Than SX)", earthLabel: "Đất SX", hasCoal: true },
};

const BASE_PATH = "/survey-standards";

/** Bề rộng cột STT của bảng nhập: tay nắm kéo + số + hai nút + / x. */
const STT_W = 150;

/**
 * Các cột LÁ của bảng nhập (không kể STT và nút xoá), theo đúng thứ tự hiển thị — dùng cho "Hiển thị bảng"
 * (kéo độ rộng, độ cao hàng) và cho `<colgroup>`. Nhãn "đất" đổi theo màn (Đất CN / Đất SX).
 */
export const buildStdCols = (earth: string, hasCoal: boolean) => [
  { key: "time", label: "Thời gian" },
  { key: "seamGroup", label: "Nhóm vỉa" },
  { key: "benchGroup", label: "Nhóm tầng" },
  { key: "excavator", label: "Máy xúc" },
  { key: "mudMark", label: "Ký hiệu bùn" },
  { key: "excavationArea", label: "Khu vực xúc" },
  { key: "suffix", label: "Hậu tố" },
  { key: "key", label: "Khoá" },
  { key: "earthM3", label: `${earth} (m3)` },
  { key: "earthDesignVolume", label: "V Tke" },
  { key: "earthDeviation", label: "Clech" },
  { key: "earthTon", label: `${earth} (tấn)` },
  { key: "earthHaulDistance", label: "CD đất" },
  { key: "earthBulkDensity", label: "Thể trọng đất (TĐ)" },
  { key: "earthTkm", label: `${earth} (tkm)` },
  ...(hasCoal
    ? [
        { key: "coalM3", label: "Than SX (m3)" },
        { key: "coalBulkDensity", label: "Thể trọng than (TĐ)" },
        { key: "coalTon", label: "Than SX (tấn)" },
        { key: "coalDesignVolume", label: "Q Tke" },
        { key: "coalDeviation", label: "Clech" },
        { key: "coalHaulDistance", label: "CD than" },
        { key: "coalTkm", label: "Than SX (Tkm)" },
      ]
    : []),
  { key: "note", label: "Ghi chú" },
];

/** Bề rộng tối thiểu (px) mỗi cột lá: ô nhập/ô ngày cần rộng hơn chữ đang có. */
const stdFloor = (key: string, label: string): number => {
  if (key === "time") return 340;
  if (key === "key") return 230;
  if (key === "note") return 180;
  if (key === "seamGroup" || key === "excavationArea") return 150;
  return Math.max(110, label.length * 8 + 44);
};

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

/** Đổi năm của ngày yyyy-MM-dd (29/2 sang năm không nhuận → 28/2) — dùng khi Sao chép sang năm khác. */
const shiftToYear = (iso: string, y: number) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const mmdd = iso.slice(5);
  const d = mmdd === "02-29" && new Date(y, 1, 29).getMonth() !== 1 ? "02-28" : mmdd;
  return `${y}-${d}`;
};

/** yyyy-MM-dd, tính theo UTC-nửa đêm để tránh lệch ngày do múi giờ máy khách. */
const parseISO = (s: string) => new Date(`${s}T00:00:00Z`);
const ONE_DAY_MS = 86_400_000;

const numOrNull = (s: string): number | null => {
  const t = s.trim();
  return t === "" ? null : Number(t.replace(",", "."));
};

/** dd/mm/yy — chủ dự án chốt định dạng hiển thị (chỉ áp cho ô CHỈ ĐỌC; ô ngày sửa được là input type="date" gốc, định dạng hiện theo trình duyệt/hệ điều hành, không tự đổi được). */
export const formatVN = (s: string) => {
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y.slice(-2)}`;
};

/**
 * Kiểm tra các khoảng thời gian CÙNG khoá có NỐI LIỀN nhau không — ngày cuối
 * của khoảng trước phải đúng bằng ngày đầu của khoảng sau trừ một, không hở
 * ngày (thiếu STD cho những ngày đó, engine sẽ ném lỗi rõ ràng lúc tính sản
 * lượng) và không chồng ngày (backend cũng tự chặn, nhưng báo ở đây SỚM hơn
 * — ngay khi đang sửa, không phải đợi tới lúc bấm lưu).
 *
 * Gộp theo `composedKey` — khớp đúng khoá backend dùng để chặn chồng lấn.
 * Hai khoá KHÁC NHAU không cần nối nhau: mỗi khoá là một dòng thời gian
 * riêng (vd hai máy xúc cùng chạy song song cả năm là bình thường).
 */
const findContiguityIssue = (entries: Entry[]): string | null => {
  const byKey = new Map<string, Entry[]>();
  for (const e of entries) {
    if (!e.composedKey.trim() || !e.effectiveFrom || !e.effectiveTo) continue;
    if (!byKey.has(e.composedKey)) byKey.set(e.composedKey, []);
    byKey.get(e.composedKey)!.push(e);
  }
  for (const [key, group] of byKey) {
    if (group.length < 2) continue;
    const sorted = [...group].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
    for (let i = 0; i < sorted.length - 1; i++) {
      const cur = sorted[i];
      const next = sorted[i + 1];
      const gapMs = parseISO(next.effectiveFrom).getTime() - parseISO(cur.effectiveTo).getTime();
      if (gapMs < ONE_DAY_MS) {
        return `Khoá "${key}": khoảng ${formatVN(cur.effectiveFrom)}–${formatVN(cur.effectiveTo)} và khoảng ${formatVN(next.effectiveFrom)}–${formatVN(next.effectiveTo)} bị CHỒNG ngày.`;
      }
      if (gapMs > ONE_DAY_MS) {
        return `Khoá "${key}": còn khoảng trống từ sau ${formatVN(cur.effectiveTo)} đến trước ${formatVN(next.effectiveFrom)} — ngày cuối dòng trên phải nối liền ngày đầu dòng dưới, không được cách ngày.`;
      }
    }
  }
  return null;
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
  /** "create" thêm mới trống · "view" chỉ xem · "edit" sửa các bản ghi đã có · "copy" nạp các bản ghi của một năm để lưu thành năm khác. */
  mode?: "create" | "view" | "edit" | "copy";
  /** Bản ghi hiện có — bắt buộc khi `mode` là "view"/"edit"/"copy", bỏ trống khi "create". */
  records?: SurveyStandardResponse[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isReadOnly = mode === "view";
  const variant = STD_VARIANTS[catalogType];

  const [year, setYear] = useState(currentYear);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [seamGroups, setSeamGroups] = useState<NamedOption[]>([]);
  const [excavationAreas, setExcavationAreas] = useState<NamedOption[]>([]);
  const [excavators, setExcavators] = useState<NamedOption[]>([]);
  const [mudMarks, setMudMarks] = useState<NamedOption[]>([]);
  const [suffixes, setSuffixes] = useState<SuffixOption[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quickOpen, setQuickOpen] = useState(false);
  const [catalogRev, setCatalogRev] = useState(0);

  const entryIdRef = useRef(0);
  const nextEntryId = () => ++entryIdRef.current;

  // Id các bản ghi GỐC — dùng để xoá khi "Lưu thay đổi" ở chế độ sửa (xem
  // handleSubmit). Chụp lại đúng lúc mở, không đổi theo entries về sau.
  const originalIdsRef = useRef<number[]>([]);
  /** Năm của các bản ghi nguồn khi Sao chép — năm đích phải khác năm này. */
  const sourceYearRef = useRef(0);

  // year đổi không được kéo lùi ngày của các dòng ĐÃ có — chỉ dòng MỚI thêm
  // sau đó mới dùng khoảng mặc định (1/1 – 31/12 của năm) hiện tại.
  const yearRef = useRef(year);
  yearRef.current = year;

  // Nạp lại từ đầu mỗi lần mở. "view"/"edit" nạp từ các bản ghi truyền vào —
  // năm mặc định lấy theo năm của dòng đầu (mọi dòng trong một lượt Xem/Sửa
  // đều thuộc cùng một năm, vì bảng ngoài đã gộp theo năm trước khi mở modal
  // này). "create" nạp trống, năm mặc định là năm hiện tại — đóng rồi mở lại
  // coi như một lượt khai mới.
  useEffect(() => {
    if (!open) return;
    setError(null);
    if (records && records.length > 0 && mode === "copy") {
      // Sao chép: nạp các dòng của năm nguồn nhưng như dòng MỚI (bỏ originalId) và dời sang năm kế tiếp; người dùng đổi năm đích ở ô Thời gian
      const y = parseInt(records[0].effectiveFrom.slice(0, 4), 10);
      const src = Number.isNaN(y) ? currentYear : y;
      sourceYearRef.current = src;
      setYear(src + 1);
      originalIdsRef.current = [];
      setEntries(
        records.map((r) => {
          const e = entryFromRecord(r, nextEntryId);
          return { ...e, originalId: undefined, effectiveFrom: shiftToYear(e.effectiveFrom, src + 1), effectiveTo: shiftToYear(e.effectiveTo, src + 1) };
        }),
      );
    } else if (records && records.length > 0) {
      const y = parseInt(records[0].effectiveFrom.slice(0, 4), 10);
      setYear(Number.isNaN(y) ? currentYear : y);
      originalIdsRef.current = records.map((r) => r.id);
      setEntries(records.map((r) => entryFromRecord(r, nextEntryId)));
    } else {
      setYear(currentYear);
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
        const res = await api.get("/suffixes", { params: { size: 500 } });
        setSuffixes((res.data?.data?.content ?? []) as SuffixOption[]);
      } catch {
        toast.error("Không tải được danh sách hậu tố.");
      }
    })();
    (async () => {
      try {
        const res = await api.get("/mud-marks", { params: { size: 500 } });
        setMudMarks((res.data?.data?.content ?? []) as NamedOption[]);
      } catch {
        toast.error("Không tải được danh sách ký hiệu bùn.");
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
  }, [open, catalogRev]);

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

  // Báo NGAY khi các khoảng thời gian cùng khoá bị hở/chồng ngày — không đợi
  // tới lúc bấm lưu mới biết (xem doc `findContiguityIssue`).
  const contiguityIssue = useMemo(() => findContiguityIssue(entries), [entries]);

  // Hiển thị bảng (kéo cột, độ cao hàng) — phải gọi TRƯỚC early return bên dưới
  const stdCols = useMemo(() => buildStdCols(variant.earthLabel, variant.hasCoal), [variant]);
  /** Cột của bảng NHẬP: không có cột Thời gian (năm chọn ở trên quyết định ngày). Chế độ xem vẫn dùng đủ `stdCols`. */
  const editCols = useMemo(() => stdCols.filter((c) => c.key !== "time"), [stdCols]);
  /** Các năm chọn được: quanh năm hiện tại (và luôn gồm năm đang chọn). */
  const yearOptions = Array.from(new Set([...Array.from({ length: 13 }, (_, i) => currentYear - 6 + i), year])).sort((a, b) => a - b);
  const layout = useTableLayout(
    `popup:std-${catalogType}`,
    stdCols,
    [] as never[],
    () => "",
    (k) => stdFloor(k, stdCols.find((c) => c.key === k)?.label ?? ""),
  );

  // Kéo thả đổi vị trí dòng (hàm di chuyển gán sau early return qua ref — hook phải gọi TRƯỚC early return)
  const moveRef = useRef<(from: number, to: number) => void>(() => {});
  const dnd = useRowDnD((f, t) => moveRef.current(f, t));

  // Chế độ XEM: bảng phẳng gọn (lọc cột, ẩn/hiện cột). Nhãn cột con trùng tên giữa Đất và Than được thêm tên nhóm cho khỏi lẫn.
  const viewCols: ViewColumn[] = useMemo(
    () =>
      stdCols.map((c) => ({
        key: c.key,
        label: c.key === "earthDeviation" ? `${variant.earthLabel}: Clech` : c.key === "coalDeviation" ? "Than SX: Clech" : c.label,
        align: c.key.startsWith("earth") || c.key.startsWith("coal") ? ("right" as const) : ("left" as const),
        strong: c.key === "key",
      })),
    [stdCols, variant],
  );
  /** Các cột số liệu theo thứ tự bảng nhập — dùng cho Nhập nhanh (số dán kèm rơi vào cột nào). */
  const valueCols = useMemo(
    () =>
      stdCols
        .filter((c) => c.key.startsWith("earth") || c.key.startsWith("coal"))
        .map((c) => {
          const group = c.key.startsWith("earth") ? variant.earthLabel : "Than SX";
          // nhãn đầy đủ như bảng STD ("Đất CN (m3)", "V Tke", "Clech", "Đất CN (tấn)"…) dưới tiêu đề nhóm
          return { key: c.key, label: `${group}: ${c.label}`, group, short: c.label };
        }),
    [stdCols, variant],
  );
  const viewText = (e: Entry, k: string): string => {
    switch (k) {
      case "time":
        return `${formatVN(e.effectiveFrom)} – ${formatVN(e.effectiveTo)}`;
      case "seamGroup":
        return seamGroups.find((s) => s.code === e.seamGroup)?.name || e.seamGroup;
      case "excavationArea":
        return e.excavationArea;
      case "key":
        return e.composedKey;
      default:
        return String((e as unknown as Record<string, unknown>)[k] ?? "");
    }
  };

  if (!open) return null;

  const addEntry = () =>
    setEntries((prev) => [
      ...prev,
      emptyEntry(`${yearRef.current}-01-01`, `${yearRef.current}-12-31`, nextEntryId),
    ]);

  const removeEntry = (id: number) =>
    setEntries((prev) => (prev.length === 1 ? prev : prev.filter((e) => e.id !== id)));

  const setField = (id: number, field: keyof Omit<Entry, "id">, value: string) =>
    setEntries((prev) => prev.map((e) => (e.id !== id ? e : { ...e, [field]: value })));

  moveRef.current = (from, to) => setEntries((prev) => moveItem(prev, from, to));

  /** Thêm các dòng đã tách từ ảnh/Excel (Nhập nhanh): nếu bảng chỉ có đúng một dòng trống chưa nhập gì thì thay luôn dòng đó. */
  const addQuickRows = (rows: QuickRow[]) =>
    setEntries((prev) => {
      const untouched = prev.length === 1 && KEY_FIELDS.every((f) => !prev[0][f]) && !prev[0].earthM3 && !prev[0].note;
      const made = rows.map((r) => ({
        ...emptyEntry(`${yearRef.current}-01-01`, `${yearRef.current}-12-31`, nextEntryId),
        ...r.fields,
        ...r.values,
      }));
      return untouched ? made : [...prev, ...made];
    });

  /** "+" ở đầu dòng — chèn một dòng TRỐNG ngay bên dưới (thời gian mặc định 1/1 – 31/12 của năm đang chọn). */
  const addEntryAfter = (id: number) =>
    setEntries((prev) => {
      const idx = prev.findIndex((e) => e.id === id);
      const blank = emptyEntry(`${yearRef.current}-01-01`, `${yearRef.current}-12-31`, nextEntryId);
      if (idx === -1) return [...prev, blank];
      const next = [...prev];
      next.splice(idx + 1, 0, blank);
      return next;
    });

  const validate = (): string | null => {
    if (entries.length === 0) return "Chưa có dòng nào.";
    if (mode === "copy" && year === sourceYearRef.current) return `Chọn năm khác năm nguồn (${year}) để sao chép.`;
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
    return findContiguityIssue(entries);
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

  const title =
    mode === "view"
      ? `Chi tiết ${variant.title}`
      : mode === "edit"
        ? `Sửa ${variant.title}`
        : mode === "copy"
          ? `Sao chép ${variant.title}`
          : `Thêm mới ${variant.title}`;
  const subtitle =
    mode === "view"
      ? "Xem lại — bấm nút Sửa ở bảng danh mục nếu cần chỉnh."
      : mode === "edit"
        ? "Sửa xong bấm Lưu thay đổi — hệ thay toàn bộ các dòng này bằng dữ liệu mới."
        : mode === "copy"
          ? "Chọn năm đích — các dòng của năm nguồn được nạp sang năm mới (ngày dời theo năm), chỉnh nếu cần rồi bấm Xác nhận."
          : `Có thể thêm nhiều dòng ${variant.title} và lưu một lần`;

  /** Ô tiêu đề của một cột lá (kèm tay nắm kéo độ rộng); `rowSpan` = 2 với cột đứng một mình, 1 với cột con của nhóm. */
  const hid = (k: string) => layout.hidden.has(k);
  const leafTh = (key: string, rowSpan: 1 | 2) => (
    <th key={key} hidden={hid(key)} rowSpan={rowSpan} style={{ position: "relative", textAlign: "center" }}>
      {key === "key" ? "" : stdCols.find((c) => c.key === key)?.label}
      <ColResizer colKey={key} layout={layout} />
    </th>
  );
  const earthKeys = ["earthM3", "earthDesignVolume", "earthDeviation", "earthTon", "earthHaulDistance", "earthBulkDensity", "earthTkm"];
  const coalKeys = ["coalM3", "coalBulkDensity", "coalTon", "coalDesignVolume", "coalDeviation", "coalHaulDistance", "coalTkm"];
  const keyKeys = ["seamGroup", "benchGroup", "excavator", "mudMark", "excavationArea", "suffix"];
  // số cột ĐANG HIỆN của từng nhóm tiêu đề (cột bị ẩn thì tiêu đề nhóm co lại; hết cột thì ẩn luôn tiêu đề nhóm)
  const shownIn = (keys: string[]) => keys.filter((k) => !hid(k)).length;
  const shownTotal = editCols.reduce((s, c) => (hid(c.key) ? s : s + layout.widthOf(c.key)), 0);

  return (
    <div
      className="tkc-modal-overlay"
      style={isFullscreen ? { padding: 0 } : isReadOnly ? { padding: 8 } : undefined}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        style={isFullscreen ? { width: "100%", height: "100%", maxHeight: "100%", borderRadius: 0 } : { width: isReadOnly ? "fit-content" : "min(1700px, 100%)", ...(isReadOnly ? { minWidth: "min(760px, 98vw)", maxWidth: "98vw", maxHeight: "96vh" } : null) }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Tiêu đề */}
        <div className="modal-header" style={isReadOnly ? { padding: "10px 18px" } : undefined}>
          <div>
            <h2>
              {title}
              {mode !== "copy" && records?.length === 1 && (
                <span style={{ marginLeft: 8, fontFamily: "monospace", fontSize: 13, fontWeight: 600, color: "#8aa0bd" }}>
                  {formatStdCode(records[0].id)}
                </span>
              )}
            </h2>
            {!isReadOnly && <p>{subtitle}</p>}
          </div>
          <button
            className="close-modal"
            style={{ marginLeft: "auto", marginRight: 6 }}
            aria-label={isFullscreen ? "Thu nhỏ cửa sổ" : "Phóng to cửa sổ"}
            title={isFullscreen ? "Thu nhỏ cửa sổ" : "Phóng to cửa sổ"}
            onClick={() => setIsFullscreen((v) => !v)}
          >
            <DIcon name={isFullscreen ? "minimize" : "maximize"} />
          </button>
          <button className="close-modal" aria-label="Đóng" onClick={onClose}>
            <DIcon name="x" />
          </button>
        </div>

        {/* Thân */}
        <div
          className="modal-body"
          style={isReadOnly ? { display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0, padding: "8px 14px", flex: "1 1 auto" } : undefined}
        >
          {/* Thời gian mặc định — chỉ áp cho dòng MỚI thêm sau đó, không cần khi chỉ xem */}
          {!isReadOnly && (
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 14, marginBottom: 16 }}>
              <div className="form-group" style={{ width: 140 }}>
                <label>Thời gian *</label>
                <select
                  className="field"
                  value={year}
                  onChange={(e) => {
                    const y = Number(e.target.value);
                    setYear(y);
                    // Bảng không còn cột Thời gian: năm đã chọn quyết định ngày của MỌI dòng (giữ nguyên ngày/tháng, chỉ đổi năm)
                    setEntries((prev) => prev.map((en) => ({ ...en, effectiveFrom: shiftToYear(en.effectiveFrom, y), effectiveTo: shiftToYear(en.effectiveTo, y) })));
                  }}
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {!isReadOnly && contiguityIssue && <p className="std-warn">⚠ {contiguityIssue}</p>}

          {isReadOnly ? (
            <ViewGrid columns={viewCols} rows={entries} textOf={viewText} storageKey={`view:std-${catalogType}`} />
          ) : (
          <>
          {/* Thanh công cụ của bảng nhập: Thêm dòng + Hiển thị bảng (như cửa sổ Chủng loại hàng) */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            {/* Chỉnh sửa: không thêm dòng mới (chỉ sửa các dòng của năm đã chọn) */}
            {!isReadOnly && mode !== "edit" && (
              <button className="btn add-row-btn" style={{ margin: 0 }} onClick={addEntry}>
                <DIcon name="plus" /> Thêm dòng
              </button>
            )}
            {mode === "create" && (
              <button className="btn" style={{ margin: 0 }} onClick={() => setQuickOpen(true)} title="Dán ảnh chụp Excel hoặc chọn file Excel để tách khoá nhanh">
                Nhập liệu thông minh (Ảnh/Excel)
              </button>
            )}
            <ColumnsMenuButton layout={layout} columns={editCols} />
            <TableLayoutButton layout={layout} columns={editCols} />
          </div>

          {/* bảng tự cuộn trong khung riêng → tiêu đề dính sát mép trên khung, không hở (cuộn bằng thanh của chính khung bảng) */}
          <div className="modal-table-scroll entry-clean-wrap" style={{ overflow: "auto", maxHeight: isFullscreen ? "calc(100vh - 330px)" : "calc(100vh - 370px)" }}>
            <table
              className={`entry-table entry-clean ${layout.tableClass}`}
              style={{ tableLayout: "fixed", width: STT_W + shownTotal, minWidth: 0 }}
            >
              <colgroup>
                <col style={{ width: STT_W }} />
                {editCols.map((c) => (
                  <col key={c.key} hidden={hid(c.key)} style={{ width: layout.widthOf(c.key) }} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <th rowSpan={2} style={{ textAlign: "center" }}>
                    STT
                  </th>
                  <th colSpan={Math.max(1, shownIn(keyKeys))} hidden={shownIn(keyKeys) === 0} style={{ textAlign: "center" }}>
                    Nhóm vỉa + Máy xúc
                  </th>
                  {leafTh("key", 2)}
                  <th colSpan={Math.max(1, shownIn(earthKeys))} hidden={shownIn(earthKeys) === 0} style={{ textAlign: "center" }}>
                    {variant.earthLabel}
                  </th>
                  {variant.hasCoal && (
                    <th colSpan={Math.max(1, shownIn(coalKeys))} hidden={shownIn(coalKeys) === 0} style={{ textAlign: "center" }}>
                      Than SX
                    </th>
                  )}
                  {leafTh("note", 2)}
                </tr>
                <tr>
                  {keyKeys.map((k) => leafTh(k, 1))}
                  {earthKeys.map((k) => leafTh(k, 1))}
                  {variant.hasCoal && coalKeys.map((k) => leafTh(k, 1))}
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
                    mudMarks={mudMarks}
                    suffixes={suffixes}
                    readOnly={isReadOnly}
                    lockRows={mode === "edit"}
                    hidden={layout.hidden}
                    hasCoal={variant.hasCoal}
                    canRemove={entries.length > 1}
                    onRemove={() => removeEntry(e.id)}
                    onAddBelow={() => addEntryAfter(e.id)}
                    onFieldChange={(field, value) => setField(e.id, field, value)}
                    rowProps={isReadOnly ? undefined : dnd.rowProps(i)}
                    dragHandleProps={isReadOnly ? undefined : dnd.handleProps(i)}
                  />
                ))}
              </tbody>
            </table>
          </div>
          </>
          )}

          {!isReadOnly && (
            <p className="entry-total">
              Tổng số <strong>{variant.title}: {entries.length}</strong>
            </p>
          )}

          {error && <div className="form-error">{error}</div>}
        </div>

        {quickOpen && (
          <StdQuickImportDialog
            catalogs={{ seamGroups, excavators, excavationAreas, mudMarks, suffixes }}
            valueCols={valueCols}
            onAdd={addQuickRows}
            onCatalogsChanged={() => setCatalogRev((v) => v + 1)}
            onClose={() => setQuickOpen(false)}
          />
        )}

        {/* Chân */}
        <div className="modal-footer" style={isReadOnly ? { padding: "8px 18px" } : undefined}>
          {isReadOnly ? (
            <button className="btn" onClick={onClose}>
              Đóng
            </button>
          ) : (
            <>
              <button className="btn" onClick={onClose} disabled={submitting}>
                Huỷ
              </button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Đang lưu..." : mode === "edit" ? "Lưu thay đổi" : "Xác nhận"}
              </button>
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
  mudMarks,
  suffixes,
  readOnly,
  lockRows,
  hidden,
  hasCoal,
  canRemove,
  onRemove,
  onAddBelow,
  onFieldChange,
  rowProps,
  dragHandleProps,
}: {
  entry: Entry;
  index: number;
  seamGroups: NamedOption[];
  excavationAreas: NamedOption[];
  excavators: NamedOption[];
  mudMarks: NamedOption[];
  suffixes: SuffixOption[];
  readOnly: boolean;
  /** Chỉnh sửa: chỉ sửa dữ liệu đã có — ẩn nút thêm/xoá dòng */
  lockRows?: boolean;
  /** cột đang ẩn (nút "Hiển thị cột") — khoá cột của bảng nhập */
  hidden: Set<string>;
  hasCoal: boolean;
  canRemove: boolean;
  onRemove: () => void;
  onAddBelow: () => void;
  onFieldChange: (field: keyof Omit<Entry, "id">, value: string) => void;
  /** kéo thả đổi vị trí dòng (chỉ create/edit): thuộc tính của `<tr>` và của tay nắm ở ô STT */
  rowProps?: React.HTMLAttributes<HTMLTableRowElement>;
  dragHandleProps?: React.HTMLAttributes<HTMLElement>;
}) {
  return (
    <tr {...rowProps}>
      <td style={{ textAlign: "center", paddingTop: readOnly ? 12 : 9 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 2 }}>
          {dragHandleProps && (
            <span className="dnd-handle" {...dragHandleProps} title="Kéo để đổi vị trí" aria-label="Kéo để đổi vị trí">
              <DIcon name="grip" />
            </span>
          )}
          <span style={{ fontWeight: 700, color: "#5b6f8f", minWidth: 18 }}>{index + 1}</span>
          {!readOnly && !lockRows && (
            <span className="time-actions">
              <button className="icon-mini" onClick={onAddBelow} title="Thêm dòng vào bên dưới" aria-label="Thêm dòng vào bên dưới">
                <DIcon name="plus" />
              </button>
              {canRemove && (
                <button className="icon-mini x" onClick={onRemove} title="Xoá dòng này" aria-label="Xoá dòng này">
                  <DIcon name="x" />
                </button>
              )}
            </span>
          )}
        </div>
      </td>

      {readOnly ? (
        <>
          <LockedCell hidden={hidden.has("seamGroup")} value={seamGroups.find((s) => s.code === entry.seamGroup)?.name || entry.seamGroup} />
          <LockedCell hidden={hidden.has("benchGroup")} value={entry.benchGroup} />
          <LockedCell hidden={hidden.has("excavator")} value={entry.excavator} />
          <LockedCell hidden={hidden.has("mudMark")} value={entry.mudMark} />
          <LockedCell hidden={hidden.has("excavationArea")} value={entry.excavationArea} />
          <LockedCell hidden={hidden.has("suffix")} value={entry.suffix} />
        </>
      ) : (
        <>
          <td hidden={hidden.has("seamGroup")}>
            <select className="field" value={entry.seamGroup} onChange={(e) => onFieldChange("seamGroup", e.target.value)}>
              <option value="">—</option>
              {seamGroups.map((s) => (
                <option key={s.id} value={s.code}>
                  {s.name}
                </option>
              ))}
            </select>
          </td>
          <td hidden={hidden.has("benchGroup")}>
            <input
              className="field"
              type="number"
              step="any"
              value={entry.benchGroup}
              onChange={(e) => onFieldChange("benchGroup", e.target.value)}
              placeholder="75"
            />
          </td>
          <td hidden={hidden.has("excavator")}>
            <select className="field" value={entry.excavator} onChange={(e) => onFieldChange("excavator", e.target.value)}>
              <option value="">—</option>
              {excavators.map((m) => (
                <option key={m.id} value={m.code}>
                  {m.code}
                </option>
              ))}
            </select>
          </td>
          <td hidden={hidden.has("mudMark")}>
            <select className="field" value={entry.mudMark} onChange={(e) => onFieldChange("mudMark", e.target.value)}>
              <option value="">—</option>
              {/* giá trị cũ gõ tay chưa có trong danh mục Ký hiệu bùn vẫn được giữ để không mất dữ liệu */}
              {entry.mudMark && !mudMarks.some((m) => m.name === entry.mudMark) && <option value={entry.mudMark}>{entry.mudMark}</option>}
              {mudMarks.map((m) => (
                <option key={m.id} value={m.name}>
                  {m.name}
                </option>
              ))}
            </select>
          </td>
          <td hidden={hidden.has("excavationArea")}>
            <select className="field" value={entry.excavationArea} onChange={(e) => onFieldChange("excavationArea", e.target.value)}>
              <option value="">—</option>
              {excavationAreas.map((a) => (
                <option key={a.id} value={a.code}>
                  {a.code}
                </option>
              ))}
            </select>
          </td>
          <td hidden={hidden.has("suffix")}>
            <select className="field" value={entry.suffix} onChange={(e) => onFieldChange("suffix", e.target.value)}>
              <option value="">—</option>
              {/* giá trị cũ gõ tay chưa có trong danh mục Hậu tố vẫn được giữ để không mất dữ liệu */}
              {entry.suffix && !suffixes.some((s) => s.suffix === entry.suffix) && <option value={entry.suffix}>{entry.suffix}</option>}
              {suffixes.map((s) => (
                <option key={s.id} value={s.suffix}>
                  {s.suffix}
                </option>
              ))}
            </select>
          </td>
        </>
      )}

      {/* Cột Khoá — luôn hiện ngay cạnh sáu ô ghép, không phải cuộn ngang mới thấy */}
      <td hidden={hidden.has("key")} style={{ paddingTop: 11 }}>
        <span style={{ wordBreak: "break-all", fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: "#0954c7" }}>
          {entry.composedKey || (
            <span style={{ fontFamily: "Arial, Helvetica, sans-serif", fontStyle: "italic", fontWeight: 400, color: "#8aa0bd" }}>(chưa đủ thông tin)</span>
          )}
        </span>
      </td>

      <NumCell hidden={hidden.has("earthM3")} readOnly={readOnly} value={entry.earthM3} onChange={(v) => onFieldChange("earthM3", v)} />
      <NumCell hidden={hidden.has("earthDesignVolume")} readOnly={readOnly} value={entry.earthDesignVolume} onChange={(v) => onFieldChange("earthDesignVolume", v)} />
      <NumCell hidden={hidden.has("earthDeviation")} readOnly={readOnly} value={entry.earthDeviation} onChange={(v) => onFieldChange("earthDeviation", v)} />
      <NumCell hidden={hidden.has("earthTon")} readOnly={readOnly} value={entry.earthTon} onChange={(v) => onFieldChange("earthTon", v)} />
      <NumCell hidden={hidden.has("earthHaulDistance")} readOnly={readOnly} value={entry.earthHaulDistance} onChange={(v) => onFieldChange("earthHaulDistance", v)} />
      <NumCell hidden={hidden.has("earthBulkDensity")} readOnly={readOnly} value={entry.earthBulkDensity} onChange={(v) => onFieldChange("earthBulkDensity", v)} />
      <NumCell hidden={hidden.has("earthTkm")} readOnly={readOnly} value={entry.earthTkm} onChange={(v) => onFieldChange("earthTkm", v)} />

      {hasCoal && (
        <>
          <NumCell hidden={hidden.has("coalM3")} readOnly={readOnly} value={entry.coalM3} onChange={(v) => onFieldChange("coalM3", v)} />
          <NumCell hidden={hidden.has("coalBulkDensity")} readOnly={readOnly} value={entry.coalBulkDensity} onChange={(v) => onFieldChange("coalBulkDensity", v)} />
          <NumCell hidden={hidden.has("coalTon")} readOnly={readOnly} value={entry.coalTon} onChange={(v) => onFieldChange("coalTon", v)} />
          <NumCell hidden={hidden.has("coalDesignVolume")} readOnly={readOnly} value={entry.coalDesignVolume} onChange={(v) => onFieldChange("coalDesignVolume", v)} />
          <NumCell hidden={hidden.has("coalDeviation")} readOnly={readOnly} value={entry.coalDeviation} onChange={(v) => onFieldChange("coalDeviation", v)} />
          <NumCell hidden={hidden.has("coalHaulDistance")} readOnly={readOnly} value={entry.coalHaulDistance} onChange={(v) => onFieldChange("coalHaulDistance", v)} />
          <NumCell hidden={hidden.has("coalTkm")} readOnly={readOnly} value={entry.coalTkm} onChange={(v) => onFieldChange("coalTkm", v)} />
        </>
      )}

      <td hidden={hidden.has("note")}>
        {readOnly ? (
          <span className="entry-text">{entry.note || "—"}</span>
        ) : (
          <input className="field" value={entry.note} onChange={(e) => onFieldChange("note", e.target.value)} />
        )}
      </td>
    </tr>
  );
}

function NumCell({ value, onChange, readOnly, hidden }: { value: string; onChange: (v: string) => void; readOnly?: boolean; hidden?: boolean }) {
  return (
    <td hidden={hidden}>
      {readOnly ? (
        <span className="entry-text">{value || "—"}</span>
      ) : (
        <input className="field" type="number" step="any" value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </td>
  );
}

/** Một ô trong sáu ô ghép khoá khi bị khoá (Xem, hoặc Sửa một dòng đã lưu) — hiện giá trị THẬT, không sửa được. */
function LockedCell({ value, hidden }: { value: string; hidden?: boolean }) {
  return <td hidden={hidden} className="entry-text">{value || "—"}</td>;
}
