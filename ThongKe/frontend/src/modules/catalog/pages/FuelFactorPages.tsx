import { useState } from "react";
import { CatalogPage } from "../CatalogPage";
import {
  BSNL_TYPES,
  COAL_CONDITIONS,
  fuelBsnlFactorConfigFor,
  fuelCoalFactorConfigFor,
  fuelRankFactorConfig,
  fuelRenovationFactorConfig,
  fuelSeasonFactorConfig,
  type BsnlTypeLabel,
  type CoalConditionLabel,
} from "../configs";

/** Năm danh mục hệ số ĐMNL / BSNL tạo động — cùng một khung CatalogPage, khác cấu hình cột. */
export function FuelSeasonFactors() {
  return <CatalogPage config={fuelSeasonFactorConfig} />;
}

export function FuelRankFactors() {
  return <CatalogPage config={fuelRankFactorConfig} />;
}

export function FuelRenovationFactors() {
  return <CatalogPage config={fuelRenovationFactorConfig} />;
}

/** Thanh tab: mỗi tab một loại/dạng điều kiện với đúng các trường phù hợp. */
function TabBar<T extends string>({ items, value, onChange }: { items: readonly T[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-slate-200 px-4 pt-3" role="tablist">
      {items.map((it) => (
        <button
          key={it}
          type="button"
          role="tab"
          aria-selected={it === value}
          onClick={() => onChange(it)}
          className={
            "rounded-t-md border border-b-0 px-3 py-1.5 text-sm font-medium " +
            (it === value
              ? "border-slate-300 bg-white text-blue-700"
              : "border-transparent bg-slate-100 text-slate-600 hover:bg-slate-200")
          }
        >
          {it}
        </button>
      ))}
    </div>
  );
}

/** HS Than (CN-NK): ba dạng điều kiện, xét theo thứ tự 1 → 2 → 3. */
export function FuelCoalFactors() {
  const [condition, setCondition] = useState<CoalConditionLabel>(COAL_CONDITIONS[0]);
  return (
    <div className="flex flex-col">
      <TabBar items={COAL_CONDITIONS} value={condition} onChange={setCondition} />
      <CatalogPage key={condition} config={fuelCoalFactorConfigFor(condition)} />
    </div>
  );
}

/** Hệ số BSNL: bảy loại, mỗi loại một tab. */
export function FuelBsnlFactors() {
  const [type, setType] = useState<BsnlTypeLabel>(BSNL_TYPES[0]);
  return (
    <div className="flex flex-col">
      <TabBar items={BSNL_TYPES} value={type} onChange={setType} />
      <CatalogPage key={type} config={fuelBsnlFactorConfigFor(type)} />
    </div>
  );
}
