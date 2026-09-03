import { CatalogPage } from "../CatalogPage";
import { densityParameterConfig } from "../configs";
import { DensityAddModal } from "../density/DensityAddModal";

export default function DensityParameters() {
  return (
    <CatalogPage
      config={densityParameterConfig}
      customAddModal={(props) => <DensityAddModal {...props} />}
    />
  );
}
