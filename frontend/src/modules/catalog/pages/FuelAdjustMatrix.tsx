import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MatrixCatalogPage } from "../matrix/MatrixCatalogPage";
import { FuelAdjustAddModal } from "../fueladjust/FuelAdjustAddModal";

export default function FuelAdjustMatrix() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);

  return (
    <>
      <MatrixCatalogPage
        code="HS_DIEU_CHINH_NLDM"
        extraActions={
          <Button size="sm" className="h-9 gap-1.5 bg-blue-600 text-white hover:bg-blue-700" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4" /> Thêm mới HS điều chỉnh NLDM
          </Button>
        }
      />
      <FuelAdjustAddModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["matrix", "HS_DIEU_CHINH_NLDM"] })}
      />
    </>
  );
}
