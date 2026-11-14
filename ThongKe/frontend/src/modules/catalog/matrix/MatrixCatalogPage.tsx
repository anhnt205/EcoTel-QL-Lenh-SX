import React, { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import "@/styles/catalog-design.css";
import { Input } from "@/components/ui/input";
import { useEmbedAutoHeight } from "@/hooks/useEmbedAutoHeight";
import api from "@/config/api.config";
import DIcon from "../design/DIcon";
import { MatrixQuickImportDialog, type MxAxis, type MxOpt, type MxResult } from "../design/MatrixQuickImportDialog";
import { ColResizer, TableLayoutButton, useTableLayout } from "../design/tableLayout";
import { cn } from "@/lib/utils";
import { downloadMatrixExcel, parseMatrixExcel } from "./matrixExcel";
import { matrixService, type MatrixCellUpsert, type MatrixGrid } from "./matrixService";
import { MatrixAxisAddModal } from "./MatrixAxisAddModal";
import { MatrixVersionBar } from "./MatrixVersionBar";

/** Ô đang sửa nhưng chưa lưu: rowKey -> colKey -> văn bản trong ô nhập. */
type DirtyMap = Record<string, Record<string, string>>;

/**
 * Màn danh mục dạng LƯỚI, dùng chung cho cả 4 bảng tra hai chiều.
 *
 * Vì sao không dùng `CatalogPage`: lưới Mô hình là ~145 chủng loại hàng ×
 * ~48 chủng loại xe. Ở dạng bảng phẳng thì mỗi ô là một dòng, người nhập
 * không thể so sánh các giá trị cạnh nhau — mà so sánh chính là việc họ làm
 * suốt khi rà soát định mức.
 */
export function MatrixCatalogPage({
  code,
  breadcrumb = ["Danh mục", "Thống kê sản lượng"],
  extraActions,
}: {
  code: string;
  breadcrumb?: string[];
  /** Nút riêng của danh mục gọi trang này (vd modal "Thêm mới" bespoke) — hiện TRƯỚC các nút chung. */
  extraActions?: React.ReactNode;
}) {
  const queryClient = useQueryClient();
  const [dirty, setDirty] = useState<DirtyMap>({});
  const [addAxis, setAddAxis] = useState<"ROW" | "COL" | null>(null);
  /** null = phiên bản mới nhất; số = xem đúng phiên bản đó. */
  const [versionId, setVersionId] = useState<number | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  useEmbedAutoHeight(contentRef, 40);
  const [quickOpen, setQuickOpen] = useState(false);

  const { data: grid, isLoading, refetch } = useQuery({
    queryKey: ["matrix", code, versionId],
    queryFn: () => matrixService.getGrid(code, versionId ?? undefined),
  });

  // Danh mục nguồn của hai trục (nếu có) — chỉ nạp khi mở "Nhập nhanh", để khớp tên dòng/cột trong ảnh với danh mục
  const sourceOf = (path?: string | null) =>
    useQuery({ // eslint-disable-line react-hooks/rules-of-hooks
      queryKey: ["matrix-axis-source", path],
      queryFn: async () => {
        const res = await api.get(path!, { params: { size: 1000 } });
        return (res.data?.data?.content ?? res.data?.data ?? []) as { id: number; code: string; name: string }[];
      },
      enabled: quickOpen && !!path,
    }).data ?? [];
  const rowSource = sourceOf(grid?.rowSourcePath);
  const colSource = sourceOf(grid?.colSourcePath);

  const dirtyCount = useMemo(
    () => Object.values(dirty).reduce((n, row) => n + Object.keys(row).length, 0),
    [dirty],
  );

  const setCell = (rowKey: string, colKey: string, text: string) =>
    setDirty((prev) => ({
      ...prev,
      [rowKey]: { ...(prev[rowKey] ?? {}), [colKey]: text },
    }));

  /** Giá trị hiện trên màn: bản đang sửa nếu có, không thì bản đã lưu. */
  const displayValue = (g: MatrixGrid, rowKey: string, colKey: string): string => {
    const edited = dirty[rowKey]?.[colKey];
    if (edited !== undefined) return edited;
    const saved = g.cells[rowKey]?.[colKey];
    return saved === undefined || saved === null ? "" : String(saved);
  };

  const saveMutation = useMutation({
    mutationFn: async (g: MatrixGrid) => {
      const payload: MatrixCellUpsert[] = [];
      const bad: string[] = [];

      for (const [rowKey, cols] of Object.entries(dirty)) {
        for (const [colKey, text] of Object.entries(cols)) {
          const raw = text.trim();
          if (raw === "") {
            // Ô xoá trắng = trả về "chưa khai báo", không phải ghi số 0.
            payload.push({ rowKey, colKey, value: null });
            continue;
          }
          const num = Number(raw.replace(",", "."));
          if (Number.isNaN(num)) {
            bad.push(`${rowKey} / ${colKey}: "${raw}"`);
            continue;
          }
          payload.push({ rowKey, colKey, value: num });
        }
      }

      if (bad.length > 0) {
        throw new Error(
          `Có ${bad.length} ô không phải số:\n${bad.slice(0, 5).join("\n")}`,
        );
      }
      return matrixService.saveCells(g.code, g.versionId, payload);
    },
    onSuccess: (affected) => {
      setDirty({});
      queryClient.invalidateQueries({ queryKey: ["matrix", code] });
      toast.success(`Đã lưu ${affected} ô.`);
    },
    onError: (e: unknown) => {
      const res = (e as { response?: { data?: { message?: string } } }).response;
      toast.error(res?.data?.message ?? (e as Error).message ?? "Lưu thất bại.");
    },
  });

  const removeAxis = async (axis: "ROW" | "COL", key: string, label: string) => {
    const what = axis === "ROW" ? "dòng" : "cột";
    if (!window.confirm(`Xoá ${what} "${label}" và toàn bộ giá trị của nó?`)) return;
    try {
      await (axis === "ROW"
        ? matrixService.removeRow(code, grid!.versionId, key)
        : matrixService.removeCol(code, grid!.versionId, key));
      queryClient.invalidateQueries({ queryKey: ["matrix", code] });
      toast.success(`Đã xoá ${what} "${label}".`);
    } catch (e: unknown) {
      const res = (e as { response?: { data?: { message?: string } } }).response;
      toast.error(res?.data?.message ?? "Xoá thất bại.");
    }
  };

  const handleImport = async (file: File) => {
    if (!grid) return;
    try {
      const { cells, errors } = await parseMatrixExcel(grid, file);
      if (errors.length > 0) {
        toast.error(
          `File có ${errors.length} vấn đề:\n${errors.slice(0, 5).join("\n")}${
            errors.length > 5 ? `\n… và ${errors.length - 5} dòng khác` : ""
          }`,
          { duration: 10000 },
        );
        if (cells.length === 0) return;
      }
      const affected = await matrixService.saveCells(code, grid.versionId, cells);
      queryClient.invalidateQueries({ queryKey: ["matrix", code] });
      setDirty({});
      toast.success(`Đã nhập ${affected} ô.`);
    } catch (e: unknown) {
      const res = (e as { response?: { data?: { message?: string } } }).response;
      toast.error(res?.data?.message ?? "Nhập file thất bại.");
    }
  };

  // Hiển thị bảng do người dùng chọn (kéo cột, kiểu cột, chiều cao hàng) — cột đầu = tiêu đề dòng
  const layoutCols = useMemo(() => [{ key: "__row", label: grid?.rowAxisLabel ?? "" }, ...(grid?.cols ?? [])], [grid]);
  const layout = useTableLayout(
    `matrix:${code}`,
    layoutCols,
    grid?.rows ?? [],
    (r, k) => (k === "__row" ? r.label : grid ? displayValue(grid, r.key, k) : ""),
    (k) => (k === "__row" ? 160 : 96),
  );

  if (isLoading || !grid) {
    return <div className="p-6 text-sm text-muted-foreground">Đang tải lưới…</div>;
  }

  const empty = grid.rows.length === 0 || grid.cols.length === 0;

  // ── Nhập nhanh (ảnh/Excel): dòng/cột nhận theo bảng nguồn; tên chưa có trong lưới mà có trong danh mục nguồn thì được thêm vào lưới ──
  type Entry = { key: string; label: string; numericValue?: number | null };
  const toAxis = (label: string, entries: Entry[], source: { code: string; name: string }[], hasSource: boolean, numeric: boolean): MxAxis => {
    const opts = new Map<string, MxOpt>();
    entries.forEach((e) => opts.set(e.key, { value: e.key, label: e.label, alt: [e.key] }));
    source.forEach((s) => {
      const o = opts.get(s.code);
      if (o) o.alt = [...(o.alt ?? []), s.name];
      else opts.set(s.code, { value: s.code, label: s.name, alt: [s.code] });
    });
    return {
      label,
      options: [...opts.values()],
      free: numeric
        ? (raw) => {
            const n = Number(raw.replace(",", "."));
            return raw.trim() !== "" && !Number.isNaN(n) ? String(n) : null;
          }
        : hasSource
          ? undefined
          : (raw) => raw.trim() || null,
    };
  };
  const quickRowAxis = toAxis(grid.rowAxisLabel, grid.rows, rowSource, !!grid.rowSourcePath, !!grid.numericRowAxis);
  const quickColAxis = toAxis(grid.colAxisLabel, grid.cols, colSource, !!grid.colSourcePath, !!grid.numericColAxis);

  const applyQuick = async (res: MxResult) => {
    try {
      // trục số: "0.50" và "0.5" là một dòng — dùng lại khoá đã có
      const keyMap = (entries: Entry[], numeric: boolean) => (k: string) =>
        numeric ? (entries.find((e) => Number(e.numericValue ?? e.key) === Number(k))?.key ?? k) : k;
      const rk = keyMap(grid.rows, !!grid.numericRowAxis);
      const ck = keyMap(grid.cols, !!grid.numericColAxis);
      const rowKeys = [...new Set(res.rows.map(rk))];
      const colKeys = [...new Set(res.cols.map(ck))];
      const nameOf = (source: { code: string; name: string }[], k: string) => source.find((s) => s.code === k)?.name ?? k;
      const haveRows = new Set(grid.rows.map((r) => r.key));
      const haveCols = new Set(grid.cols.map((c) => c.key));
      const newRows = rowKeys.filter((k) => !haveRows.has(k));
      const newCols = colKeys.filter((k) => !haveCols.has(k));
      if (newRows.length > 0) await matrixService.addRows(code, grid.versionId, newRows.map((k) => ({ key: k, label: nameOf(rowSource, k) })));
      if (newCols.length > 0) await matrixService.addCols(code, grid.versionId, newCols.map((k) => ({ key: k, label: nameOf(colSource, k) })));
      setDirty((prev) => {
        const next: DirtyMap = { ...prev };
        res.cells.forEach((c) => {
          const r = rk(c.row);
          next[r] = { ...(next[r] ?? {}), [ck(c.col)]: c.value };
        });
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["matrix", code] });
      const added = newRows.length + newCols.length;
      toast.success(`Đã đưa ${res.cells.length} ô vào lưới${added > 0 ? ` (thêm mới ${newRows.length} dòng, ${newCols.length} cột)` : ""} — bấm Lưu để ghi.`);
    } catch (e: unknown) {
      const r = (e as { response?: { data?: { message?: string } } }).response;
      toast.error(r?.data?.message ?? "Nhập nhanh thất bại.");
    }
  };

  return (
    <div className="tkc">
      <div ref={contentRef}>
        <div className="breadcrumbs">
          <DIcon name="home" />
          {breadcrumb.map((b) => (
            <React.Fragment key={b}>
              <span>{b}</span>
              <DIcon name="chevron-right" className="crumb-chev" />
            </React.Fragment>
          ))}
          <strong>{grid.name}</strong>
        </div>

        <section className="panel" style={{ paddingBottom: 14 }}>
          <div className="panel-top">
            <div className="heading">
              <span className="heading-icon">
                <DIcon name="boxes" />
              </span>
              <div>
                <h1>{grid.name}</h1>
                <p>
                  Dòng: {grid.rowAxisLabel} · Cột: {grid.colAxisLabel} · Đơn vị: {grid.valueLabel}
                </p>
              </div>
            </div>

            <div className="button-group">
              <TableLayoutButton layout={layout} columns={layoutCols} />
              {extraActions}
              <input
                ref={importRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleImport(f);
                  e.target.value = "";
                }}
              />
              <button className="btn btn-primary" onClick={() => setAddAxis("ROW")}>
                <DIcon name="plus" /> Thêm dòng
              </button>
              <button className="btn btn-primary" onClick={() => setAddAxis("COL")}>
                <DIcon name="plus" /> Thêm cột
              </button>
              <button className="btn" onClick={() => importRef.current?.click()}>
                <DIcon name="upload" /> Tải lên (Excel)
              </button>
              <button className="btn" onClick={() => setQuickOpen(true)} title="Chụp ảnh bảng / chọn file Excel — tự tách dòng, cột và giá trị">
                <DIcon name="upload" /> Nhập liệu thông minh (Ảnh/Excel)
              </button>
              <button className="btn" onClick={() => downloadMatrixExcel(grid)}>
                <DIcon name="download" /> Tải xuống (Excel)
              </button>
              {dirtyCount > 0 && (
                <button className="btn" onClick={() => setDirty({})}>
                  <DIcon name="refresh" /> Bỏ sửa
                </button>
              )}
              <button
                className="btn btn-primary"
                disabled={dirtyCount === 0 || saveMutation.isPending}
                onClick={() => saveMutation.mutate(grid)}
              >
                <DIcon name="check" />
                {dirtyCount > 0 ? `Lưu ${dirtyCount} ô` : "Lưu"}
              </button>
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <MatrixVersionBar
              grid={grid}
              onChangeVersion={(id) => { setVersionId(id); setDirty({}); }}
              onCreated={(id) => { setVersionId(id); setDirty({}); }}
              onDeleted={() => {
                // Về phiên bản mới nhất. Nếu đang ở sẵn đó (versionId null) thì đổi
                // state không kích hoạt tải lại, nên gọi refetch tường minh —
                // không thì màn hình còn hiển thị phiên bản vừa xoá.
                setVersionId(null);
                setDirty({});
                refetch();
              }}
            />
          </div>

          {grid.note && (
            <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              {grid.note}
            </p>
          )}

          {empty ? (
            <div className="empty-state">
              Lưới chưa có {grid.rows.length === 0 ? "dòng" : "cột"} nào. Dùng nút "Thêm {grid.rows.length === 0 ? "dòng" : "cột"}" để bắt đầu.
            </div>
          ) : (
            <div className="table-scroll" style={{ maxHeight: "calc(100vh - 330px)", minHeight: 220 }}>
              <table className={`mx-grid ${layout.tableClass}`} style={{ width: layout.totalWidth }}>
                <colgroup>
                  {layoutCols.map((c) => (
                    <col key={c.key} style={{ width: layout.widthOf(c.key) }} />
                  ))}
                </colgroup>
                <thead>
                  <tr>
                    {/* Ô góc: vừa dính trên vừa dính trái nên cần z cao hơn cả hai */}
                    <th className="mx-th mx-corner">
                      {grid.rowAxisLabel}
                      <ColResizer colKey="__row" layout={layout} />
                    </th>
                    {grid.cols.map((c) => (
                      <th key={c.key} className="mx-th group">
                        <div className="flex items-center justify-center gap-1">
                          <span className="truncate" title={c.key}>{c.label}</span>
                          <button
                            title={`Xoá cột ${c.label}`}
                            onClick={() => removeAxis("COL", c.key, c.label)}
                            className="opacity-0 transition group-hover:opacity-100"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-white" />
                          </button>
                        </div>
                        <ColResizer colKey={c.key} layout={layout} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {grid.rows.map((r) => (
                    <tr key={r.key} className="group/row">
                      <th className="mx-rowhead">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate" title={r.key}>{r.label}</span>
                          <button
                            title={`Xoá dòng ${r.label}`}
                            onClick={() => removeAxis("ROW", r.key, r.label)}
                            className="opacity-0 transition group-hover/row:opacity-100"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </button>
                        </div>
                      </th>
                      {grid.cols.map((c) => {
                        const isDirty = dirty[r.key]?.[c.key] !== undefined;
                        return (
                          <td key={c.key} className="mx-cell">
                            <Input
                              type="number"
                              step="any"
                              value={displayValue(grid, r.key, c.key)}
                              onChange={(e) => setCell(r.key, c.key, e.target.value)}
                              className={cn(
                                "h-8 rounded-none border-0 text-right text-sm shadow-none focus-visible:ring-1",
                                // Đánh dấu ô đã sửa chưa lưu, để rời đi rồi quay
                                // lại vẫn biết mình đang dở việc ở đâu.
                                isDirty && "bg-amber-50",
                              )}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {quickOpen && (
        <MatrixQuickImportDialog
          title={grid.name}
          rowAxis={quickRowAxis}
          colAxis={quickColAxis}
          onApply={(res) => void applyQuick(res)}
          onClose={() => setQuickOpen(false)}
        />
      )}

      {addAxis && (
        <MatrixAxisAddModal
          grid={grid}
          axis={addAxis}
          onClose={() => setAddAxis(null)}
          onSaved={() => {
            setAddAxis(null);
            queryClient.invalidateQueries({ queryKey: ["matrix", code] });
          }}
        />
      )}
    </div>
  );
}
