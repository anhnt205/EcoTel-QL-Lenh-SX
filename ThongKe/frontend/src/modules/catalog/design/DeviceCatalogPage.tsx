import { useState } from "react";

import type { Device } from "@/types";

import AssetEbook from "@/components/common/AssetEbook";
import type { CatalogConfig } from "../types";
import { CatalogDesignPage } from "./CatalogDesignPage";
import DIcon from "./DIcon";

const idOf = (d: Device) => String((d as unknown as { id?: number }).id ?? d._id);

/**
 * Trang danh mục Xe / Máy: bảng + biểu mẫu theo thiết kế, thêm nút mắt ở cột Thao tác để mở hồ sơ tài sản
 * (AssetEbook) ở khung bên phải. Bấm lại nút mắt của cùng thiết bị thì đóng.
 */
export default function DeviceCatalogPage({ config }: { config: CatalogConfig }) {
  const [viewingDevice, setViewingDevice] = useState<Device | null>(null);

  return (
    <div className="flex">
      <div className={`min-w-0 ${viewingDevice ? "w-1/2" : "w-full"}`}>
        <CatalogDesignPage
          config={config}
          extraRowActions={(row) => (
            <button
              className="row-action view"
              title="Xem hồ sơ tài sản"
              onClick={() => {
                const device = row as unknown as Device;
                setViewingDevice((prev) => (prev && idOf(prev) === idOf(device) ? null : device));
              }}
            >
              <DIcon name="eye" />
            </button>
          )}
        />
      </div>
      {viewingDevice && (
        <div className="flex min-h-[480px] w-1/2 flex-col overflow-hidden border-l bg-card p-4">
          <AssetEbook asset={viewingDevice} onClose={() => setViewingDevice(null)} />
        </div>
      )}
    </div>
  );
}
