import { CatalogPage } from "../CatalogPage";
import { cargoTypeConfig } from "../configs";

export default function CargoTypesCatalog() {
  // Bố cục theo thiết kế (2026-11-09) là mặc định của CatalogPage — dùng chung cho mọi danh mục.
  return <CatalogPage config={cargoTypeConfig} />;
}
