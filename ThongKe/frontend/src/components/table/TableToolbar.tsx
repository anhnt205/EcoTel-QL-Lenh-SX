import React, { useRef, useState } from "react";
import {
  Search,
  Filter,
  RotateCcw,
  Download,
  Upload,
  Plus,
  Columns,
  FileText,
  Printer,
  Table as TableIcon,
  Maximize,
  Minimize,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface TableToolbarProps {
  searchValue?: string;
  /** Callback duy nhất khi search thay đổi (real-time) */
  onSearch?: (value: string) => void;
  searchPlaceholder?: string;
  showFilter?: boolean;
  filterActive?: boolean;
  onFilterToggle?: () => void;
  filterNode?: React.ReactNode;
  onRefresh?: () => void;
  onAdd?: () => void;
  onImportExcel?: (file: File) => void;
  isImporting?: boolean;
  importExcelAccept?: string;
  showExport?: boolean;
  onExportCsv?: () => void;
  /** Nhãn của mục xuất trong menu. Mặc định "Xuất CSV" để giữ nguyên hành
   *  vi cũ; trang nào xuất .xlsx thì truyền nhãn đúng. */
  exportCsvLabel?: string;
  onExportPdf?: () => void;
  onPrint?: () => void;
  showColumnToggle?: boolean;
  toggleableColumns?: {
    id: string;
    label: string;
    isVisible: boolean;
    onToggle: (val: boolean) => void;
  }[];
  title?: string;
  selectedCount?: number;
  customActions?: React.ReactNode;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

const TableToolbar: React.FC<TableToolbarProps> = ({
  searchValue = "",
  onSearch,
  searchPlaceholder = "Tìm kiếm...",
  showFilter = true,
  filterActive = false,
  onFilterToggle,
  filterNode,
  onRefresh,
  onAdd,
  onImportExcel,
  isImporting = false,
  importExcelAccept = ".csv,.tsv,.txt,.xlsx,.xls",
  showExport = true,
  onExportCsv,
  exportCsvLabel = "Xuất CSV",
  onExportPdf,
  onPrint,
  showColumnToggle = false,
  toggleableColumns,
  title,
  selectedCount = 0,
  customActions,
  isFullscreen = false,
  onToggleFullscreen,
}) => {
  const [localSearch, setLocalSearch] = useState(searchValue);
  const [prevSearchValue, setPrevSearchValue] = useState(searchValue);
  const importInputRef = useRef<HTMLInputElement>(null);

  if (searchValue !== prevSearchValue) {
    setPrevSearchValue(searchValue);
    setLocalSearch(searchValue);
  }
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalSearch(value);
    onSearch?.(value);
  };

  const handleImportChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onImportExcel?.(file);
    e.target.value = "";
  };

  // Fix: chỉ render Export dropdown khi có ít nhất 1 callback
  const hasExportAction = onExportCsv || onExportPdf || onPrint;

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between px-4 py-1.5 gap-4 border-b rounded-t-lg",
        selectedCount > 0 ? "bg-muted/50" : "bg-card",
      )}
    >
      {/* Left section */}
      <div className="flex items-center flex-1 gap-4">
        {selectedCount > 0 ? (
          <span className="text-sm font-semibold text-primary">
            {selectedCount} đã chọn
          </span>
        ) : (
          <>
            {title && (
              <span className="hidden mr-2 text-base font-semibold lg:inline-block">
                {title}
              </span>
            )}
            <div className="relative w-full max-w-[240px] focus-within:max-w-[360px] transition-all duration-300 ease-in-out">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={localSearch}
                onChange={handleSearchChange}
                className="pl-8 border-none h-9 bg-muted/50 focus-visible:ring-1"
              />
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-1">
        {customActions}

        <TooltipProvider>
          {showFilter && filterNode ? (
            <Popover
              open={filterActive}
              onOpenChange={(open) => {
                if (!open && filterActive) onFilterToggle?.();
                if (open && !filterActive) onFilterToggle?.();
              }}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button
                      variant={filterActive ? "secondary" : "ghost"}
                      size="icon"
                      className="h-9 w-9"
                    >
                      <Filter
                        className={cn(
                          "h-4 w-4",
                          filterActive && "text-primary",
                        )}
                      />
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent>Bộ lọc</TooltipContent>
              </Tooltip>
              <PopoverContent
                align="end"
                className="w-[360px] sm:w-[480px] p-0"
              >
                {filterNode}
              </PopoverContent>
            </Popover>
          ) : showFilter && !filterNode ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={filterActive ? "secondary" : "ghost"}
                  size="icon"
                  className="h-9 w-9"
                  onClick={onFilterToggle}
                >
                  <Filter
                    className={cn("h-4 w-4", filterActive && "text-primary")}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Bộ lọc</TooltipContent>
            </Tooltip>
          ) : null}

          {showColumnToggle &&
            toggleableColumns &&
            toggleableColumns.length > 0 && (
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-9 w-9">
                        <Columns className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Cột hiển thị</TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end" className="w-[180px]">
                  <DropdownMenuLabel>Hiển thị cột</DropdownMenuLabel>
                  <Separator className="my-1" />
                  {toggleableColumns.map((col) => (
                    <DropdownMenuCheckboxItem
                      key={col.id}
                      className="capitalize"
                      checked={col.isVisible}
                      onCheckedChange={col.onToggle}
                    >
                      {col.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

          {onRefresh && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={onRefresh}
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Làm mới</TooltipContent>
            </Tooltip>
          )}

          {onToggleFullscreen && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={onToggleFullscreen}
                >
                  {isFullscreen ? (
                    <Minimize className="w-4 h-4" />
                  ) : (
                    <Maximize className="w-4 h-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isFullscreen ? "Thu nhỏ" : "Toàn màn hình"}
              </TooltipContent>
            </Tooltip>
          )}

          {onImportExcel && (
            <>
              <input
                ref={importInputRef}
                type="file"
                accept={importExcelAccept}
                className="hidden"
                onChange={handleImportChange}
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => importInputRef.current?.click()}
                    disabled={isImporting}
                  >
                    {isImporting ? (
                      <div className="w-4 h-4 animate-spin border-2 border-current border-t-transparent rounded-full" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isImporting ? "Đang xử lý..." : "Nhập Excel"}
                </TooltipContent>
              </Tooltip>
            </>
          )}

          {/* Fix: chỉ render khi có ít nhất 1 export action */}
          {showExport && hasExportAction && (
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                      <Download className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>Xuất dữ liệu</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end">
                {onExportCsv && (
                  <DropdownMenuItem onClick={onExportCsv}>
                    <TableIcon className="w-4 h-4 mr-2" />
                    <span>{exportCsvLabel}</span>
                  </DropdownMenuItem>
                )}
                {onExportPdf && (
                  <DropdownMenuItem onClick={onExportPdf}>
                    <FileText className="w-4 h-4 mr-2" />
                    <span>Xuất PDF</span>
                  </DropdownMenuItem>
                )}
                {onPrint && (
                  <DropdownMenuItem onClick={onPrint}>
                    <Printer className="w-4 h-4 mr-2" />
                    <span>In</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </TooltipProvider>

        {onAdd && (
          <>
            <Separator orientation="vertical" className="h-6 mx-1" />
            <Button size="sm" className="gap-1 px-3 h-9" onClick={onAdd}>
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline-block">Thêm mới</span>
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default TableToolbar;
