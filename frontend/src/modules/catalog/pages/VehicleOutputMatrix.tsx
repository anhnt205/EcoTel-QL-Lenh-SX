import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MatrixCatalogPage } from "../matrix/MatrixCatalogPage";
import { VehicleOutputAddModal } from "../vehicleoutput/VehicleOutputAddModal";

export default function VehicleOutputMatrix() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);

  return (
    <>
      <MatrixCatalogPage
        code="NANG_SUAT_XE"
        extraActions={
          <Button size="sm" className="h-9 gap-1.5 bg-blue-600 text-white hover:bg-blue-700" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4" /> Thêm mới năng suất xe
          </Button>
        }
      />
      <VehicleOutputAddModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["matrix", "NANG_SUAT_XE"] })}
      />
    </>
  );
}
