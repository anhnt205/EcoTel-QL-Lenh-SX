import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { MonthRangePicker, splitByMonth } from "../design/MonthInput";
import DIcon from "../design/DIcon";
import { ColResizer, TableLayoutButton, useTableLayout } from "../design/tableLayout";
import ViewGrid, { ColumnsMenuButton, type ViewColumn } from "../design/ViewGrid";
import { MatrixQuickImportDialog, type MxResult } from "../design/MatrixQuickImportDialog";
import { moveItem, useRowDnD } from "../design/useRowDnD";
import "@/styles/catalog-design.css";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import api from "@/config/api.config";
import { createCatalogService } from "../catalogService";
import { densityParameterConfig } from "../configs";
import type { DensityBatch, DensityParameterResponse } from "./types";

interface CargoTypeOption {
  id: number;
  code: string;
  name: string;
  cargoGroupName?: string | null;
  acceptanceProductName?: string | null;
  ttlClhName?: string | null;
}

interface ExcavationAreaOption {
  id: number;
  name: string;
}

/** Payload gửi lên — khớp `DensityParameterRequest` phía backend. */
interface DensityParameterPayload {
  id?: number;
  cargoTypeId: number;
  excavationAreaId: number | null;
  effectiveFrom: string;
  effectiveTo: string;
  densityWet: number;
  densityDry: number;
  note: string | null;
}

/** Một khoảng thời gian hiệu lực trong năm, gắn liền một dòng nhập tỷ trọng. */
interface Period {
  id: number;
  effectiveFrom: string;
  effectiveTo: string;
  densityWet: string;
  densityDry: string;
  note: string;
}

/** Một chủng loại hàng đã chọn, kèm các khoảng thời gian của nó. */
interface Group {
  cargoTypeCode: string;
  /** Khu vực xúc riêng của nhóm — chỉ dùng khi SỬA CẢ NĂM (mỗi nhóm một khu vực). Bỏ trống (undefined) = lấy khu vực chọn chung ở trên. */
  areaId?: number | null;
  periods: Period[];
}

/** Cột của bảng nhập (không kể STT và nút xoá) — dùng cho "Hiển thị bảng": kéo độ rộng, độ cao hàng như bảng Chủng loại hàng. */
const DENSITY_COLS = [
  { key: "time", label: "Thời gian" },
  { key: "code", label: "Mã chủng loại hàng" },
  { key: "name", label: "Chủng loại hàng" },
  { key: "group", label: "Nhóm chủng loại hàng" },
  { key: "spnt", label: "Sản phẩm nghiệm thu" },
  { key: "ttl", label: "TTL CLH" },
  { key: "dry", label: "Tỷ trọng (không QA)" },
  { key: "wet", label: "Tỷ trọng (QA)" },
  { key: "note", label: "Ghi chú" },
];
const DENSITY_VIEW_COLS: ViewColumn[] = DENSITY_COLS.map((c) => ({
  ...c,
  align: c.key === "dry" || c.key === "wet" ? "right" : "left",
  strong: c.key === "code",
}));
type DensityViewRow = { g: Group; p: Period; c?: CargoTypeOption };
const densityViewText = (r: DensityViewRow, k: string): string => {
  switch (k) {
    case "time":
      return `${formatVN(r.p.effectiveFrom)} – ${formatVN(r.p.effectiveTo)}`;
    case "area":
      return "";
    case "code":
      return r.g.cargoTypeCode;
    case "name":
      return r.c?.name ?? "";
    case "group":
      return r.c?.cargoGroupName ?? "";
    case "spnt":
      return r.c?.acceptanceProductName ?? "";
    case "ttl":
      return r.c?.ttlClhName ?? "";
    case "dry":
      return r.p.densityDry;
    case "wet":
      return r.p.densityWet;
    default:
      return r.p.note;
  }
};

/** Bề rộng tối thiểu từng cột (px): ô nhập/ô ngày cần rộng hơn chữ đang có. */
const DENSITY_FLOOR: Record<string, number> = { time: 370, area: 170, code: 100, name: 100, group: 100, spnt: 100, ttl: 80, dry: 130, wet: 120, note: 150 };
/** Chữ dùng để đo "vừa nội dung": chỉ các cột tĩnh (cột có ô nhập/ô ngày dùng bề rộng tối thiểu, tránh cột nhảy khi gõ). */
const densityFitText = (r: DensityViewRow, k: string): string => (["time", "area", "dry", "wet", "note"].includes(k) ? "" : densityViewText(r, k));

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 7 }, (_, i) => currentYear - 3 + i);

const defaultPeriod = (year: number, nextId: () => number): Period => ({
  id: nextId(),
  effectiveFrom: `${year}-01-01`,
  effectiveTo: `${year}-12-31`,
  densityWet: "",
  densityDry: "",
  note: "",
});

/** yyyy-MM-dd, tính theo UTC-nửa đêm để tránh lệch ngày do múi giờ máy khách. */
const parseISO = (s: string) => new Date(`${s}T00:00:00Z`);
const toISO = (d: Date) => d.toISOString().slice(0, 10);
const ONE_DAY_MS = 86_400_000;

/** Chỉ dùng để HIỂN THỊ cột "Thời gian" ở chế độ xem — dạng tháng/năm (MM/yyyy); ô nhập vẫn chọn đến ngày. */
const formatVN = (s: string) => {
  const [y, m] = s.split("-");
  return `${m}/${y}`;
};

/** Hai khoảng chồng lấn khi khoảng sau bắt đầu trước khi khoảng trước kết thúc. */
const hasOverlap = (periods: Period[]) => {
  const sorted = [...periods].sort((a, b) =>
    a.effectiveFrom.localeCompare(b.effectiveFrom),
  );
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].effectiveFrom <= sorted[i - 1].effectiveTo) return true;
  }
  return false;
};


/** Sửa một ô ngày thì tự nối tiếp khoảng liền kề trong cùng mã hàng: đổi "Đến" → "Từ" của khoảng SAU = Đến + 1 ngày; đổi "Từ" → "Đến" của khoảng TRƯỚC = Từ − 1 ngày. */
const chainPeriods = <P extends { id: number; effectiveFrom: string; effectiveTo: string }>(
  periods: P[],
  periodId: number,
  key: "effectiveFrom" | "effectiveTo",
  value: string,
): P[] => {
  const idx = periods.findIndex((p) => p.id === periodId);
  if (idx === -1) return periods;
  const out = periods.map((p) => (p.id === periodId ? { ...p, [key]: value } : p));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return out;
  const shifted = (days: number) => toISO(new Date(parseISO(value).getTime() + days * ONE_DAY_MS));
  if (key === "effectiveTo" && idx + 1 < out.length) out[idx + 1] = { ...out[idx + 1], effectiveFrom: shifted(1) };
  if (key === "effectiveFrom" && idx > 0) out[idx - 1] = { ...out[idx - 1], effectiveTo: shifted(-1) };
  return out;
};

type Mode = "create" | "view" | "edit" | "editYear" | "copyYear";

/** Dời một ngày yyyy-MM-dd sang năm khác (29/02 sang năm không nhuận → 28/02). */
const shiftToYear = (iso: string, y: number) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const mmdd = iso.slice(5);
  const d = mmdd === "02-29" && new Date(y, 1, 29).getMonth() !== 1 ? "02-28" : mmdd;
  return `${y}-${d}`;
};

/**
 * Modal "Thêm mới tỷ trọng" — thiết kế riêng cho danh mục Tỷ trọng, thay cho
 * modal chung `CatalogFormModal`. Dùng chung cho CẢ BA việc: thêm mới, xem
 * chi tiết một LÔ đã lưu, và sửa một lô đã lưu — chỉ khác nhau ở `mode`.
 *
 * Khác biệt cốt lõi với modal chung: người dùng không gõ tay từng dòng.
 * Chọn NĂM + Khu vực xúc (áp dụng chung cho cả lượt nhập) rồi chọn NHIỀU mã
 * chủng loại hàng — bảng tự sinh một dòng cho mỗi mã, tự điền tên/nhóm/SPNT/
 * TTL CLH từ danh mục Chủng loại hàng, người dùng chỉ còn gõ hai ô tỷ trọng.
 * MỌI dòng đều có nút "+" để tách khoảng thời gian của chính dòng đó thành
 * hai — bấm lại vào khoảng vừa tách được tiếp, nên chia được thành bao
 * nhiêu khoảng nhỏ tuỳ ý trong năm, không giới hạn một lần chia đôi.
 *
 * Lưu xuống vẫn PHẲNG — mỗi khoảng thời gian của mỗi mã hàng là một bản ghi
 * `DensityParameterRequest` riêng, gửi qua `/density-parameters/bulk`. Tầng
 * "phiếu"/"lô" trên màn hình chỉ là cách nhập/xem cho nhanh, không có gì lưu
 * thêm — bảng danh mục ngoài tự gộp lại thành LÔ từ đúng các bản ghi phẳng
 * này (xem `types.ts#groupIntoBatches`).
 *
 * Chế độ SỬA lưu bằng cách THAY THẾ toàn bộ lô: tạo bộ bản ghi mới trước
 * (nếu lỗi thì dữ liệu cũ còn nguyên, không mất gì), chỉ xoá các bản ghi cũ
 * SAU KHI tạo mới thành công — tránh khoảng hở kiểu "xoá trước, lỡ tạo mới
 * lỗi thì mất trắng dữ liệu".
 */
export function DensityAddModal({
  open,
  mode = "create",
  batch,
  yearRecords,
  onClose,
  onSaved,
}: {
  open: boolean;
  /** "create" thêm mới trống · "view" chỉ xem · "edit" sửa một lô đã có · "editYear" sửa cả năm · "copyYear" sao chép cả năm sang năm mới. */
  mode?: Mode;
  /** Lô hiện có — bắt buộc khi `mode` là "view"/"edit", bỏ trống khi "create". */
  batch?: DensityBatch;
  /** Mọi bản ghi của một NĂM — bắt buộc khi `mode` là "editYear" (sửa cả bảng tỷ trọng của năm). */
  yearRecords?: DensityParameterResponse[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const service = useMemo(
    () => createCatalogService<DensityParameterPayload>(densityParameterConfig.basePath),
    [],
  );

  const isReadOnly = mode === "view";
  /** Sửa/sao chép CẢ NĂM: nạp mọi bản ghi của năm, khu vực xúc chọn chung ở ô trên cùng. */
  const yearMode = mode === "editYear" || mode === "copyYear";
  /** Chỉnh sửa = sửa dữ liệu ĐÃ CÓ: không thêm/bớt mã hàng, khoảng thời gian */
  const lockStructure = mode === "edit" || mode === "editYear";

  const [year, setYear] = useState(currentYear);
  const [excavationAreaId, setExcavationAreaId] = useState<string>("");
  const [cargoTypeCodes, setCargoTypeCodes] = useState<string[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [cargoTypes, setCargoTypes] = useState<CargoTypeOption[]>([]);
  const [excavationAreas, setExcavationAreas] = useState<ExcavationAreaOption[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargoAnchorRef = useComboboxAnchor();
  const periodIdRef = useRef(0);
  const nextPeriodId = () => ++periodIdRef.current;

  // year đổi không được kéo lùi ngày của các nhóm ĐÃ có — chỉ nhóm MỚI sinh
  // ra sau đó mới dùng năm hiện tại. Giữ trong ref để effect dưới không phải
  // liệt kê `year` vào deps (liệt kê vào sẽ viết đè ngày của nhóm cũ).
  const yearRef = useRef(year);
  yearRef.current = year;
  // khu vực chọn chung ở trên — dùng cho nhóm MỚI thêm khi sửa cả năm
  const areaRef = useRef(excavationAreaId);
  areaRef.current = excavationAreaId;

  /**
   * Dữ liệu gốc để dựng nhóm khi `cargoTypeCodes` đổi — bản ghi có sẵn của
   * lô (view/edit) thắng giá trị mặc định "cả năm, tỷ trọng trống" của chế
   * độ thêm mới. Khoá bằng mã hàng vì trong MỘT lô, mỗi mã hàng có nhiều
   * nhất một bản ghi (khoá gộp của lô đã cố định Thời gian + Khu vực xúc).
   */
  const seedByCode = useMemo(() => {
    const m = new Map<string, DensityBatch["records"][number]>();
    batch?.records.forEach((r) => m.set(r.cargoTypeCode, r));
    return m;
  }, [batch]);

  // Nạp lại từ đầu mỗi lần mở. "view"/"edit" nạp từ lô truyền vào; "create"
  // nạp trống — đóng rồi mở lại coi như một lượt nhập mới. KHÔNG dựng
  // `groups` ở đây: effect đồng bộ theo `cargoTypeCodes` bên dưới đảm nhiệm
  // việc đó, để chỉ có DUY NHẤT một chỗ ghi vào `groups` — hai effect cùng
  // ghi vào state đó trong cùng một lượt render sẽ đua nhau bằng closure cũ
  // và effect chạy sau ghi đè mất kết quả của effect chạy trước.
  useEffect(() => {
    if (!open) return;
    setError(null);
    if (batch) {
      setYear(Number(batch.effectiveFrom.slice(0, 4)));
      setExcavationAreaId(batch.excavationAreaId != null ? String(batch.excavationAreaId) : "");
      setCargoTypeCodes(batch.records.map((r) => r.cargoTypeCode));
    } else if ((mode === "editYear" || mode === "copyYear") && yearRecords?.length) {
      // SỬA CẢ NĂM: dựng nhóm trực tiếp từ MỌI bản ghi của năm — mỗi nhóm = (khu vực xúc, mã hàng), các khoảng thời gian theo thứ tự ngày.
      const srcYear = Number(yearRecords[0].effectiveFrom.slice(0, 4));
      // SAO CHÉP: mặc định sang năm kế tiếp (đổi ô Năm thì dời toàn bộ ngày theo); SỬA: giữ nguyên năm
      const targetYear = mode === "copyYear" ? srcYear + 1 : srcYear;
      setYear(targetYear);
      // khu vực chung: nếu mọi bản ghi cùng một khu vực thì chọn sẵn khu vực đó (nhiều khu vực → ô hiện "Nhiều khu vực", dòng giữ nguyên)
      const areaSet = new Set(yearRecords.map((r) => r.excavationAreaId ?? null));
      const onlyArea = areaSet.size === 1 ? [...areaSet][0] : null;
      setExcavationAreaId(onlyArea != null ? String(onlyArea) : "");
      const byKey = new Map<string, Group>();
      [...yearRecords]
        .sort((a, b) => a.excavationAreaName.localeCompare(b.excavationAreaName, "vi") || a.cargoTypeCode.localeCompare(b.cargoTypeCode, "vi", { numeric: true }) || a.effectiveFrom.localeCompare(b.effectiveFrom))
        .forEach((r) => {
          const key = `${r.excavationAreaId ?? "null"}|${r.cargoTypeCode}`;
          let g = byKey.get(key);
          if (!g) {
            g = { cargoTypeCode: r.cargoTypeCode, areaId: r.excavationAreaId, periods: [] };
            byKey.set(key, g);
          }
          g.periods.push({
            id: nextPeriodId(),
            effectiveFrom: mode === "copyYear" ? shiftToYear(r.effectiveFrom, targetYear) : r.effectiveFrom,
            effectiveTo: mode === "copyYear" ? shiftToYear(r.effectiveTo, targetYear) : r.effectiveTo,
            densityWet: String(r.densityWet),
            densityDry: String(r.densityDry),
            note: r.note ?? "",
          });
        });
      const seeded = [...byKey.values()];
      setGroups(seeded);
      setCargoTypeCodes([...new Set(seeded.map((g) => g.cargoTypeCode))]);
    } else {
      setYear(currentYear);
      setExcavationAreaId("");
      setCargoTypeCodes([]);
    }
  }, [open, batch, yearRecords, mode]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const res = await api.get("/cargo-types", { params: { size: 500 } });
        const list = (res.data?.data?.content ?? res.data?.data ?? []) as CargoTypeOption[];
        setCargoTypes(list);
      } catch {
        toast.error("Không tải được danh sách chủng loại hàng.");
      }
    })();
    (async () => {
      try {
        const res = await api.get("/excavation-areas", { params: { size: 500 } });
        const list = (res.data?.data?.content ?? res.data?.data ?? []) as ExcavationAreaOption[];
        setExcavationAreas(list);
      } catch {
        toast.error("Không tải được danh sách khu vực xúc.");
      }
    })();
  }, [open]);

  const cargoByCode = useMemo(
    () => new Map(cargoTypes.map((c) => [c.code, c])),
    [cargoTypes],
  );

  // Đồng bộ nhóm theo lựa chọn mã hàng: thêm nhóm mới (kế thừa bản ghi có
  // sẵn trong `seedByCode` nếu có, không thì một khoảng = cả năm), giữ
  // nguyên dữ liệu đã gõ của nhóm còn được chọn, bỏ nhóm bị bỏ chọn.
  useEffect(() => {
    setGroups((prev) => {
      // giữ MỌI nhóm của mã còn được chọn (khi sửa cả năm một mã có thể có nhiều nhóm theo khu vực), thêm nhóm cho mã mới
      const kept = prev.filter((g) => cargoTypeCodes.includes(g.cargoTypeCode));
      const have = new Set(kept.map((g) => g.cargoTypeCode));
      const added = cargoTypeCodes.filter((c) => !have.has(c)).map((code): Group => {
        const seed = seedByCode.get(code);
        if (seed) {
          return {
            cargoTypeCode: code,
            periods: [
              {
                id: nextPeriodId(),
                effectiveFrom: seed.effectiveFrom,
                effectiveTo: seed.effectiveTo,
                densityWet: String(seed.densityWet),
                densityDry: String(seed.densityDry),
                note: seed.note ?? "",
              },
            ],
          };
        }
        return {
          cargoTypeCode: code,
          ...(mode === "editYear" || mode === "copyYear" ? { areaId: areaRef.current ? Number(areaRef.current) : null } : null),
          periods: [defaultPeriod(yearRef.current, nextPeriodId)],
        };
      });
      const order = new Map(cargoTypeCodes.map((c, i) => [c, i]));
      return [...kept, ...added].sort((a, b) => (order.get(a.cargoTypeCode) ?? 0) - (order.get(b.cargoTypeCode) ?? 0));
    });
  }, [cargoTypeCodes, seedByCode]);

  // Chế độ XEM: danh sách phẳng (mỗi khoảng thời gian một dòng) cho bảng gọn có lọc cột / ẩn hiện cột
  const viewRows = useMemo(
    () =>
      groups.flatMap((g) => {
        const c = cargoByCode.get(g.cargoTypeCode);
        return g.periods.map((p) => ({ g, p, c }));
      }),
    [groups, cargoByCode],
  );
  const cols = DENSITY_COLS;
  // Kéo thả đổi vị trí NHÓM mã hàng (hàm di chuyển gán sau early return qua ref)
  const moveRef = useRef<(from: number, to: number) => void>(() => {});
  const dnd = useRowDnD((f, t) => moveRef.current(f, t));
  const layout = useTableLayout(mode === "editYear" ? "popup:density-edit-year" : "popup:density-add", cols, viewRows, densityFitText, (k) => DENSITY_FLOOR[k] ?? 100, 48);

  if (!open) return null;

  const setPeriodField = (
    groupIdx: number,
    periodId: number,
    key: keyof Omit<Period, "id">,
    value: string,
  ) =>
    setGroups((prev) =>
      prev.map((g, i) =>
        i !== groupIdx
          ? g
          : {
              ...g,
              periods:
                key === "effectiveFrom" || key === "effectiveTo"
                  ? chainPeriods(g.periods, periodId, key, value)
                  : g.periods.map((p) => (p.id !== periodId ? p : { ...p, [key]: value })),
            },
      ),
    );

  /**
   * Tách MỘT khoảng bất kỳ thành hai khoảng liền kề, chia đôi theo ngày.
   *
   * Nút "+" có ở MỌI dòng, không chỉ dòng cuối — bấm lại vào khoảng vừa
   * tách ra được tiếp, nên chia được thành bao nhiêu khoảng nhỏ tuỳ ý,
   * không giới hạn ở việc chia đôi một lần. Khoảng mới kế thừa tỷ trọng/ghi
   * chú của khoảng gốc — chỉ cần sửa lại ngày chia và các ô khác biệt.
   */
  const splitPeriod = (groupIdx: number, periodId: number) => {
    setGroups((prev) =>
      prev.map((g, i) => {
        if (i !== groupIdx) return g;
        const idx = g.periods.findIndex((p) => p.id === periodId);
        if (idx === -1) return g;
        const target = g.periods[idx];
        const cut = splitByMonth(target.effectiveFrom, target.effectiveTo);
        if (!cut) {
          toast.error("Khoảng thời gian này chỉ có 1 tháng, không tách được.");
          return g;
        }
        const { firstTo, secondFrom } = cut;
        const periods = [...g.periods];
        periods.splice(
          idx,
          1,
          { ...target, effectiveTo: firstTo },
          { ...target, id: nextPeriodId(), effectiveFrom: secondFrom },
        );
        return { ...g, periods };
      }),
    );
  };

  /** Xóa cả một nhóm (chỉ khi sửa cả năm, nhóm còn đúng 1 khoảng); bỏ luôn mã khỏi ô chọn nếu không còn nhóm nào của mã đó. */
  const removeGroup = (groupIdx: number) => {
    const target = groups[groupIdx];
    if (!target) return;
    setGroups((prev) => prev.filter((_, i) => i !== groupIdx));
    if (!groups.some((g, i) => i !== groupIdx && g.cargoTypeCode === target.cargoTypeCode)) {
      setCargoTypeCodes((prev) => prev.filter((c) => c !== target.cargoTypeCode));
    }
  };

  /** Đổi Năm: khi SAO CHÉP thì dời toàn bộ ngày của bảng sang năm mới. */
  const changeYear = (y: number) => {
    setYear(y);
    if (mode === "copyYear") {
      setGroups((prev) =>
        prev.map((g) => ({
          ...g,
          periods: g.periods.map((p) => ({ ...p, effectiveFrom: shiftToYear(p.effectiveFrom, y), effectiveTo: shiftToYear(p.effectiveTo, y) })),
        })),
      );
    }
  };

  /** Kéo thả: đưa nhóm `from` tới vị trí `to`; thứ tự ô "Mã chủng loại hàng" đổi theo để effect đồng bộ không xếp lại. */
  const moveGroup = (from: number, to: number) => {
    const next = moveItem(groups, from, to);
    if (next === groups) return;
    setGroups(next);
    setCargoTypeCodes([...new Set(next.map((g) => g.cargoTypeCode))]);
  };
  moveRef.current = moveGroup;

  /**
   * Nhập nhanh (ảnh/Excel): thêm các mã hàng thấy trong bảng nguồn rồi điền Tỷ trọng (không QA)/(QA) vào khoảng thời gian ĐẦU TIÊN
   * của mỗi mã (mã đã có thì chỉ ghi đè ô có trong nguồn). Cột lạ (tên, nhóm, ghi chú…) tự bỏ qua.
   */
  const applyQuick = (res: MxResult) => {
    const byRow = new Map<string, { dry?: string; wet?: string }>();
    res.cells.forEach((c) => byRow.set(c.row, { ...(byRow.get(c.row) ?? {}), [c.col]: c.value }));
    setGroups((prev) => {
      const have = new Set(prev.map((g) => g.cargoTypeCode));
      const added: Group[] = res.rows
        .filter((c, i) => !have.has(c) && res.rows.indexOf(c) === i)
        .map((code) => ({
          cargoTypeCode: code,
          ...(yearMode ? { areaId: areaRef.current ? Number(areaRef.current) : null } : null),
          periods: [defaultPeriod(yearRef.current, nextPeriodId)],
        }));
      return [...prev, ...added].map((g) => {
        const v = byRow.get(g.cargoTypeCode);
        if (!v) return g;
        return {
          ...g,
          periods: g.periods.map((p, i) =>
            i === 0 ? { ...p, ...(v.dry != null ? { densityDry: v.dry } : null), ...(v.wet != null ? { densityWet: v.wet } : null) } : p,
          ),
        };
      });
    });
    setCargoTypeCodes((prev) => [...prev, ...res.rows.filter((c, i) => !prev.includes(c) && res.rows.indexOf(c) === i)]);
    toast.success(`Đã thêm ${res.rows.length} mã hàng từ bảng nguồn.`);
  };

  /** Sửa cả năm: chọn khu vực xúc ở ô trên cùng thì ÁP CHO MỌI dòng của bảng (không chọn thì giữ nguyên khu vực từng dòng). */
  const applyAreaToAll = (value: string) => {
    setExcavationAreaId(value);
    setGroups((prev) => prev.map((g) => ({ ...g, areaId: value === "" ? null : Number(value) })));
  };

  const removePeriod = (groupIdx: number, periodId: number) =>
    setGroups((prev) =>
      prev.map((g, i) =>
        i !== groupIdx || g.periods.length === 1
          ? g
          : { ...g, periods: g.periods.filter((p) => p.id !== periodId) },
      ),
    );

  const validate = (): string | null => {
    if (groups.length === 0) return "Chọn ít nhất một mã chủng loại hàng.";
    for (const g of groups) {
      const label = cargoByCode.get(g.cargoTypeCode)?.name ?? g.cargoTypeCode;
      for (let i = 0; i < g.periods.length; i++) {
        const p = g.periods[i];
        if (!p.effectiveFrom || !p.effectiveTo) {
          return `"${label}", khoảng ${i + 1}: chưa chọn đủ ngày.`;
        }
        if (p.effectiveFrom > p.effectiveTo) {
          return `"${label}", khoảng ${i + 1}: "Từ ngày" phải trước "Đến ngày".`;
        }
        if (!p.densityWet.trim()) {
          return `"${label}", khoảng ${i + 1}: thiếu Tỷ trọng (QA).`;
        }
        if (!p.densityDry.trim()) {
          return `"${label}", khoảng ${i + 1}: thiếu Tỷ trọng (không QA).`;
        }
      }
      if (hasOverlap(g.periods)) {
        return `"${label}": các khoảng thời gian bị chồng lấn nhau.`;
      }
    }
    // cùng (khu vực xúc, mã hàng) nằm ở nhiều nhóm (đổi khu vực trùng nhau) thì các khoảng cũng không được chồng lấn
    const merged = new Map<string, Period[]>();
    for (const g of groups) {
      const area = g.areaId !== undefined ? g.areaId : excavationAreaId ? Number(excavationAreaId) : null;
      const k = `${area}|${g.cargoTypeCode}`;
      merged.set(k, [...(merged.get(k) ?? []), ...g.periods]);
    }
    for (const [k, ps] of merged) {
      if (hasOverlap(ps)) return `Mã "${k.split("|")[1]}": các khoảng thời gian bị chồng lấn giữa các dòng cùng khu vực xúc.`;
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
      // Sao chép = tạo bản MỚI: năm đích không được trùng năm đã có dữ liệu
      if (mode === "copyYear") {
        const all = await api.get(densityParameterConfig.basePath, { params: { size: 1000 } });
        const existing = (all.data?.data?.content ?? all.data?.data ?? []) as { effectiveFrom: string }[];
        if (existing.some((r) => r.effectiveFrom.startsWith(`${year}-`))) {
          setError(`Năm ${year} đã có dữ liệu tỷ trọng — chọn năm khác để sao chép (hoặc dùng Sửa).`);
          setSubmitting(false);
          return;
        }
      }
      const areaId = excavationAreaId ? Number(excavationAreaId) : null;
      const payloads = groups.flatMap((g) => {
        const cargoTypeId = cargoByCode.get(g.cargoTypeCode)!.id;
        return g.periods.map((p) => ({
          cargoTypeId,
          excavationAreaId: g.areaId !== undefined ? g.areaId : areaId,
          effectiveFrom: p.effectiveFrom,
          effectiveTo: p.effectiveTo,
          densityWet: Number(p.densityWet.replace(",", ".")),
          densityDry: Number(p.densityDry.replace(",", ".")),
          note: p.note.trim() || null,
        }));
      });
      if ((mode === "edit" && batch) || (mode === "editYear" && yearRecords?.length)) {
        // "Sửa" = thay THẲNG cả lô, một giao dịch backend duy nhất — KHÔNG
        // gọi tạo-rồi-xoá rời nhau ở đây. Trường hợp sửa phổ biến nhất là
        // chỉ đổi tỷ trọng, giữ nguyên thời gian; lúc đó bản ghi cũ và bản
        // ghi mới trùng nguyên khoảng ngày, và nếu tạo trước thì kiểm tra
        // chồng lấn phía backend sẽ coi chúng là hai bản ghi chồng nhau rồi
        // chặn nhầm. Backend xoá trước trong cùng giao dịch với tạo mới, và
        // rollback cả hai nếu tạo lỗi — xem `DensityParameterService#replaceBatch`.
        const res = await api.put(`${densityParameterConfig.basePath}/batch`, {
          deleteIds: (mode === "editYear" ? (yearRecords ?? []) : (batch?.records ?? [])).map((r) => r.id),
          creates: payloads,
        });
        const saved = (res.data?.data ?? []) as unknown[];
        toast.success(mode === "editYear" ? `Đã cập nhật năm ${year} — ${saved.length} tỷ trọng.` : `Đã cập nhật lô — ${saved.length} tỷ trọng.`);
      } else {
        await service.bulkCreate(payloads);
        toast.success(`Đã thêm ${payloads.length} tỷ trọng.`);
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

  const totalPeriods = groups.reduce((n, g) => n + g.periods.length, 0);

  const title =
    mode === "view" ? "Bảng tỷ trọng" : mode === "edit" ? "Sửa tỷ trọng" : mode === "editYear" ? `Sửa bảng tỷ trọng năm ${year}` : mode === "copyYear" ? "Sao chép bảng tỷ trọng" : "Thêm mới tỷ trọng";
  const subtitle =
    mode === "view"
      ? "Xem lại lô đã lưu — bấm nút Sửa ở bảng danh mục nếu cần chỉnh."
      : mode === "edit"
        ? "Sửa xong bấm Lưu thay đổi — hệ thay toàn bộ lô cũ bằng dữ liệu mới."
        : mode === "editYear"
          ? "Sửa cả bảng tỷ trọng của năm: đổi thời gian, khu vực xúc, tỷ trọng đã có (không thêm/bớt mã hàng). Lưu thay toàn bộ dữ liệu của năm này bằng bảng mới."
        : mode === "copyYear"
          ? "Sao chép cả bảng tỷ trọng của năm cũ — đổi ô Năm để dời toàn bộ ngày sang năm mới, chỉnh sửa rồi bấm Xác nhận để tạo."
        : "Chọn năm, khu vực xúc và các mã chủng loại hàng — bảng tự điền, chỉ cần gõ tỷ trọng";

  const mixedAreas = new Set(groups.map((g) => g.areaId ?? null)).size > 1;
  const hid = (k: string) => k !== "time" && layout.hidden.has(k);
  const shownWidth = cols.reduce((s, c) => (hid(c.key) ? s : s + layout.widthOf(c.key)), 0);

  return (
    <>
    <div
      className="tkc-modal-overlay"
      style={isFullscreen ? { padding: 0 } : isReadOnly ? { padding: 8 } : undefined}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        style={isFullscreen ? { width: "100%", height: "100%", maxHeight: "100%", borderRadius: 0 } : { width: isReadOnly ? "fit-content" : "min(1560px, 100%)", ...(isReadOnly ? { minWidth: "min(760px, 98vw)", maxWidth: "98vw", maxHeight: "96vh" } : null) }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Tiêu đề */}
        <div className="modal-header" style={isReadOnly ? { padding: "10px 18px" } : undefined}>
          <div>
            <h2 style={isReadOnly ? { margin: 0 } : undefined}>{title}</h2>
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
          {isReadOnly ? null : (
            /* mb lớn: danh sách xổ xuống của combobox nổi qua portal, chỉ né mép màn hình chứ không né nội dung bên dưới —
               nếu sát bảng thì dù chỉ 1 mã hàng cũng che mất hàng tiêu đề của bảng nhập. */
            <div className="entry-top" style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 14, marginBottom: 28 }}>
              <Field label="Năm *" style={{ width: 140 }}>
                <select className="field" value={String(year)} disabled={mode === "editYear"} onChange={(e) => changeYear(Number(e.target.value))}>
                  {(YEAR_OPTIONS.includes(year) ? YEAR_OPTIONS : [year, ...YEAR_OPTIONS]).map((y) => (
                    <option key={y} value={String(y)}>
                      {y}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Khu vực xúc" style={{ width: 280 }}>
                <select
                  className="field"
                  value={yearMode && mixedAreas ? "__mixed" : excavationAreaId}
                  onChange={(e) => (yearMode ? applyAreaToAll(e.target.value) : setExcavationAreaId(e.target.value))}
                >
                  {yearMode && mixedAreas && (
                    <option value="__mixed" disabled>
                      Nhiều khu vực (giữ nguyên từng dòng)
                    </option>
                  )}
                  <option value="">Tất cả khu vực</option>
                  {excavationAreas.map((a) => (
                    <option key={a.id} value={String(a.id)}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Mã chủng loại hàng *" style={{ minWidth: 320, flex: 1 }}>
                <Combobox items={cargoTypes.map((c) => c.code)} multiple disabled={lockStructure} value={cargoTypeCodes} onValueChange={setCargoTypeCodes}>
                  <ComboboxChips ref={cargoAnchorRef} className="min-h-[39px] flex-nowrap overflow-hidden rounded-[8px] border-[#cfdbec] text-sm">
                    <ComboboxValue placeholder="Chọn một hoặc nhiều mã...">
                      {cargoTypeCodes.slice(0, 3).map((code) => (
                        <ComboboxChip key={code} className="rounded-full bg-[#b8c6dc] px-2.5 py-0.5 text-xs font-medium text-[#16294a]">
                          {code}
                        </ComboboxChip>
                      ))}
                      {cargoTypeCodes.length > 3 && (
                        <span className="rounded-full bg-[#dde8f7] px-2.5 py-0.5 text-xs font-semibold text-[#16294a]">+{cargoTypeCodes.length - 3}</span>
                      )}
                    </ComboboxValue>
                    <ComboboxChipsInput placeholder={cargoTypeCodes.length === 0 ? "Chọn một hoặc nhiều mã..." : ""} className="text-sm" />
                  </ComboboxChips>
                  <ComboboxContent anchor={cargoAnchorRef} sideOffset={4} align="start" className="z-[120]">
                    <ComboboxEmpty className="py-2 text-xs text-gray-400">Không tìm thấy chủng loại hàng</ComboboxEmpty>
                    <ComboboxList>
                      {(code: string) => (
                        <ComboboxItem key={code} value={code} className="text-sm data-selected:bg-[#dde8f7] data-selected:font-medium">
                          <span className="font-mono text-xs text-gray-500">{code}</span>
                          {" — "}
                          {cargoByCode.get(code)?.name ?? code}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              </Field>
            </div>
          )}

          {isReadOnly && groups.length === 0 ? (
            <p className="entry-empty">Không có dữ liệu.</p>
          ) : isReadOnly ? (
            <ViewGrid
              columns={DENSITY_VIEW_COLS}
              rows={viewRows}
              textOf={densityViewText}
              storageKey="view:density"
              summary={
                <div className="vg-summary">
                  <span>Năm<strong>{year}</strong></span>
                  <span>Khu vực xúc<strong>{batch?.excavationAreaName ?? "Tất cả khu vực"}</strong></span>
                  <span>Số mã hàng<strong>{groups.length}</strong></span>
                </div>
              }
            />
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 8, marginBottom: 12 }}>
                {mode === "create" && (
                  <button className="btn" type="button" onClick={() => setQuickOpen(true)} title="Chụp ảnh bảng / chọn file Excel — tự tách mã hàng và tỷ trọng">
                    <DIcon name="upload" /> Nhập liệu thông minh (Ảnh/Excel)
                  </button>
                )}
                <ColumnsMenuButton layout={layout} columns={cols.filter((c) => c.key !== "time")} />
                <TableLayoutButton layout={layout} columns={cols} />
              </div>
              <div className="modal-table-scroll entry-clean-wrap">
                <table
                  className={`entry-table entry-clean ${layout.tableClass}`}
                  style={{ tableLayout: "fixed", width: 76 + shownWidth }}
                >
                  <colgroup>
                    <col style={{ width: 76 }} />
                    {cols.map((c) => (
                      <col key={c.key} hidden={hid(c.key)} style={{ width: layout.widthOf(c.key) }} />
                    ))}
                  </colgroup>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "center" }}>STT</th>
                      {cols.map((c) => (
                        <th key={c.key} hidden={hid(c.key)} style={{ position: "relative", ...(c.key === "time" ? { textAlign: "center" } : null) }}>
                          {c.label}
                          {!isReadOnly && (c.key === "dry" || c.key === "wet") ? " *" : ""}
                          <ColResizer colKey={c.key} layout={layout} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {groups.length === 0 && (
                      <>
                        <tr className="entry-ghost">
                          <td colSpan={cols.filter((c) => !hid(c.key)).length + 1} className="entry-ghost-hint">
                            Chọn mã chủng loại hàng ...
                          </td>
                        </tr>
                        {[0, 1].map((i) => (
                          <tr key={`ghost${i}`} className="entry-ghost">
                            {Array.from({ length: cols.filter((c) => !hid(c.key)).length + 1 }).map((_, j) => (
                              <td key={j}>
                                <span className="entry-skel" />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </>
                    )}
                    {groups.map((g, gi) => {
                      const cargo = cargoByCode.get(g.cargoTypeCode);
                      return g.periods.map((p, pi) => (
                        <tr key={p.id} {...dnd.rowProps(gi)}>
                          <td style={{ textAlign: "center", fontWeight: 700, color: "#5b6f8f" }}>
                            <div className="entry-stt" style={{ justifyContent: "center" }}>
                              {pi === 0 ? (
                                <span className="dnd-handle" {...dnd.handleProps(gi)} title="Kéo để đổi vị trí" aria-label="Kéo để đổi vị trí">
                                  <DIcon name="grip" />
                                </span>
                              ) : (
                                <span className="dnd-handle ghost" />
                              )}
                              <span className="entry-stt-no">{pi === 0 ? gi + 1 : ""}</span>
                            </div>
                          </td>
                          <td hidden={hid("time")}>
                            {isReadOnly ? (
                              <span className="entry-text">
                                {formatVN(p.effectiveFrom)} – {formatVN(p.effectiveTo)}
                              </span>
                            ) : (
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <div style={{ flex: "1 1 0", minWidth: 0 }}>
                                  <MonthRangePicker
                                    from={p.effectiveFrom}
                                    to={p.effectiveTo}
                                    onChange={(f, t) => {
                                      setPeriodField(gi, p.id, "effectiveFrom", f);
                                      setPeriodField(gi, p.id, "effectiveTo", t);
                                    }}
                                  />
                                </div>
                                {!lockStructure && (
                                <span className="time-actions">
                              <button
                                className="icon-mini"
                                onClick={() => splitPeriod(gi, p.id)}
                                title="Tách thời gian này thành hai khoảng"
                                aria-label="Tách thời gian này thành hai khoảng"
                              >
                                <DIcon name="plus" />
                              </button>
                              <button
                                className={`icon-mini x ${g.periods.length > 1 || yearMode ? "" : "ghost"}`}
                                onClick={() => (g.periods.length > 1 ? removePeriod(gi, p.id) : removeGroup(gi))}
                                disabled={g.periods.length <= 1 && !yearMode}
                                title={g.periods.length > 1 ? "Xoá khoảng thời gian này" : "Xoá dòng này"}
                                aria-label={g.periods.length > 1 ? "Xoá khoảng thời gian này" : "Xoá dòng này"}
                              >
                                <DIcon name="x" />
                              </button>
                                </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td hidden={hid("code")} className="entry-text" style={{ fontWeight: 700, color: "#1a4f9d" }}>{g.cargoTypeCode}</td>
                          <td hidden={hid("name")} className="entry-text">{cargo?.name ?? ""}</td>
                          <td hidden={hid("group")} className="entry-text">{cargo?.cargoGroupName ?? ""}</td>
                          <td hidden={hid("spnt")} className="entry-text">{cargo?.acceptanceProductName ?? ""}</td>
                          <td hidden={hid("ttl")} className="entry-text">{cargo?.ttlClhName ?? ""}</td>
                          <td hidden={hid("dry")}>
                            {isReadOnly ? (
                              <span className="entry-text">{p.densityDry}</span>
                            ) : (
                              <input
                                className="field"
                                type="number"
                                step="any"
                                value={p.densityDry}
                                onChange={(e) => setPeriodField(gi, p.id, "densityDry", e.target.value)}
                              />
                            )}
                          </td>
                          <td hidden={hid("wet")}>
                            {isReadOnly ? (
                              <span className="entry-text">{p.densityWet}</span>
                            ) : (
                              <input
                                className="field"
                                type="number"
                                step="any"
                                value={p.densityWet}
                                onChange={(e) => setPeriodField(gi, p.id, "densityWet", e.target.value)}
                              />
                            )}
                          </td>
                          <td hidden={hid("note")}>
                            {isReadOnly ? (
                              <span className="entry-text">{p.note || "—"}</span>
                            ) : (
                              <input
                                className="field"
                                value={p.note}
                                onChange={(e) => setPeriodField(gi, p.id, "note", e.target.value)}
                                placeholder="Giai đoạn..."
                              />
                            )}
                          </td>
                        </tr>
                      ));
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {groups.length > 0 && !isReadOnly && (
            <p className="entry-total">
              Tổng số{" "}
              <strong>
                {groups.length} mã hàng · {totalPeriods} khoảng thời gian
              </strong>
            </p>
          )}

          {error && <div className="form-error">{error}</div>}
        </div>

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
                {submitting ? "Đang lưu..." : mode === "edit" || mode === "editYear" ? "Lưu thay đổi" : "Xác nhận"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
    {quickOpen && (
      <MatrixQuickImportDialog
        title="tỷ trọng"
        unknownCol="ignore"
        rowAxis={{ label: "Mã chủng loại hàng", options: cargoTypes.map((c) => ({ value: c.code, label: c.code, alt: [c.name] })) }}
        colAxis={{
          label: "Tỷ trọng",
          options: [
            { value: "dry", label: "Tỷ trọng (không QA)", alt: ["Tỷ trọng không QA", "Không QA", "TT không QA", "Tỷ trọng khô"] },
            { value: "wet", label: "Tỷ trọng (QA)", alt: ["Tỷ trọng QA", "QA", "TT QA", "Tỷ trọng ướt"] },
          ],
        }}
        onApply={applyQuick}
        onClose={() => setQuickOpen(false)}
      />
    )}
    </>
  );
}

function Field({ label, style, children }: { label: string; style?: React.CSSProperties; children: React.ReactNode }) {
  return (
    <div className="form-group" style={style}>
      <label>{label}</label>
      {children}
    </div>
  );
}
