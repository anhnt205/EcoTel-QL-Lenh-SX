export interface ColumnDef {
  key: string;
  label: string;
  required?: boolean;
  type?: "text" | "number" | "select" | "date";
  options?: string[];
  width?: string;
}
