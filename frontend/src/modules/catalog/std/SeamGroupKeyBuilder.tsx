import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy, KeyRound } from "lucide-react";
import { toast } from "sonner";
import api from "@/config/api.config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface NamedItem {
  id: number;
  code: string;
  name: string;
}

const SUFFIXES = ["BK", "SPNT", "2,25", "dthai"];

/**
 * Bộ dựng khoá "Nhóm vỉa + Máy xúc" cho hai màn STD.
 *
 * <b>Khoá được ghép ở BACKEND</b>, không ghép tại đây. Cùng một hàm sẽ được
 * engine tính sản lượng dùng để suy khoá của mỗi chuyến; nếu giao diện tự
 * ghép theo cách riêng thì chỉ cần lệch một dấu gạch dưới là dòng danh mục
 * không bao giờ khớp — và triệu chứng sẽ là "thiếu dữ liệu STD" chứ không
 * phải một lỗi rõ ràng.
 *
 * Hậu tố ở đây do người dùng CHỌN, vì lúc khai báo STD chưa có chuyến nào để
 * suy ra. Khi tính toán thì ngược lại: hệ tự suy hậu tố từ Nơi dỡ tải / Nhóm
 * CLH / Tỷ trọng (docx dòng 492–500).
 */
export function SeamGroupKeyBuilder() {
  const [open, setOpen] = useState(false);
  const [seamGroup, setSeamGroup] = useState("");
  const [benchGroup, setBenchGroup] = useState("");
  const [excavator, setExcavator] = useState("");
  const [mudMark, setMudMark] = useState("");
  const [excavationArea, setExcavationArea] = useState("");
  const [suffixes, setSuffixes] = useState<string[]>([]);
  const [key, setKey] = useState("");

  const { data: seamGroups = [] } = useQuery({
    queryKey: ["seam-groups-all"],
    queryFn: async () => {
      const res = await api.get("/seam-groups", { params: { size: 500 } });
      return (res.data?.data?.content ?? []) as NamedItem[];
    },
    enabled: open,
  });

  const { data: areas = [] } = useQuery({
    queryKey: ["excavation-areas-all"],
    queryFn: async () => {
      const res = await api.get("/excavation-areas", { params: { size: 500 } });
      return (res.data?.data?.content ?? []) as NamedItem[];
    },
    enabled: open,
  });

  // Ghép lại mỗi khi có thay đổi, để người dùng thấy ngay khoá sẽ ra sao.
  useEffect(() => {
    if (!open) return;
    if (!seamGroup && !benchGroup && !excavator && !excavationArea) {
      setKey("");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await api.post("/survey-standards/build-key", {
          seamGroup, benchGroup, excavator, mudMark, excavationArea, suffixes,
        });
        if (!cancelled) setKey(res.data?.data?.key ?? "");
      } catch {
        if (!cancelled) setKey("");
      }
    })();
    return () => { cancelled = true; };
  }, [open, seamGroup, benchGroup, excavator, mudMark, excavationArea, suffixes]);

  const toggleSuffix = (s: string) =>
    setSuffixes((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(key);
      toast.success("Đã chép khoá. Dán vào ô “Nhóm vỉa + Máy xúc” khi thêm dòng.");
    } catch {
      toast.error("Trình duyệt không cho chép tự động. Hãy bôi đen và chép tay.");
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-9 gap-1.5"
        onClick={() => setOpen(true)}
      >
        <KeyRound className="h-4 w-4" />
        Dựng khoá
      </Button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-xl dark:bg-gray-900">
            <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
              <h2 className="text-base font-semibold">
                Dựng khoá Nhóm vỉa + Máy xúc
              </h2>
              <p className="text-xs text-muted-foreground">
                Nhóm vỉa _ Nhóm tầng _ Máy xúc _ Ký hiệu bùn _ Khu vực xúc _ hậu tố
              </p>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-auto px-6 py-4">
              <Field label="Nhóm vỉa">
                <select
                  value={seamGroup}
                  onChange={(e) => setSeamGroup(e.target.value)}
                  className="h-9 w-full rounded-md border bg-transparent px-2 text-sm"
                >
                  <option value="">— chọn —</option>
                  {seamGroups.map((s) => (
                    <option key={s.id} value={s.code}>{s.name}</option>
                  ))}
                </select>
              </Field>

              <Field label="Nhóm tầng">
                {/* Nhóm tầng là giá trị TÍNH ra (bội của 15), không có danh
                    mục — nên nhập số trực tiếp. */}
                <Input
                  type="number"
                  step="any"
                  value={benchGroup}
                  onChange={(e) => setBenchGroup(e.target.value)}
                  placeholder="vd 75 hoặc -200"
                  className="h-9"
                />
              </Field>

              <Field label="Máy xúc">
                <Input
                  value={excavator}
                  onChange={(e) => setExcavator(e.target.value)}
                  placeholder="vd ht7."
                  className="h-9"
                />
              </Field>

              <Field label="Ký hiệu bùn">
                {/* Khi tính toán, hệ TỰ SUY ký hiệu này từ Chủng loại hàng.
                    Ở đây phải nhập tay vì lúc khai STD chưa có chuyến nào —
                    nên liệt kê sẵn giá trị hợp lệ để không gõ sai. */}
                <select
                  value={mudMark}
                  onChange={(e) => setMudMark(e.target.value)}
                  className="h-9 w-full rounded-md border bg-transparent px-2 text-sm"
                >
                  <option value="">— không có —</option>
                  <option value="Bun">Bun</option>
                  <option value="BĐ">BĐ</option>
                  <option value="D.uot">D.uot</option>
                  <option value="Dbun">Dbun</option>
                  <option value="cũ">cũ</option>
                  <option value="Bun_cũ">Bun_cũ</option>
                </select>
              </Field>

              <Field label="Khu vực xúc">
                <select
                  value={excavationArea}
                  onChange={(e) => setExcavationArea(e.target.value)}
                  className="h-9 w-full rounded-md border bg-transparent px-2 text-sm"
                >
                  <option value="">— chọn —</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.code}>{a.name}</option>
                  ))}
                </select>
              </Field>

              <Field label="Hậu tố">
                <div className="flex flex-wrap gap-3">
                  {SUFFIXES.map((s) => (
                    <label key={s} className="flex items-center gap-1.5 text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-blue-600"
                        checked={suffixes.includes(s)}
                        onChange={() => toggleSuffix(s)}
                      />
                      {s}
                    </label>
                  ))}
                </div>
              </Field>

              <div className="rounded-md border bg-muted/40 px-3 py-2">
                <p className="text-[11px] uppercase text-muted-foreground">
                  Khoá kết quả
                </p>
                <p className="break-all font-mono text-sm">
                  {key || <span className="text-muted-foreground">(chưa đủ thông tin)</span>}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-200 px-6 py-3 dark:border-gray-800">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Đóng
              </Button>
              <Button
                className="gap-1.5 bg-blue-600 text-white hover:bg-blue-700"
                disabled={!key}
                onClick={copy}
              >
                <Copy className="h-4 w-4" />
                Chép khoá
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-center gap-3">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </div>
  );
}
