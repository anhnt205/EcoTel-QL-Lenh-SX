"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "radix-ui"

import { cn } from "@/utils/cn"
import { Button } from "@/components/ui/button"
import { Maximize2, Minimize2, Minus, XIcon } from "lucide-react"
import { useIsTabActive } from "@/layouts/tab-active-context"
import { useModalWindowStore } from "@/stores/useModalWindowStore"

/**
 * Chỉ `Dialog` (root) mới điều khiển được `open` thật của Radix — `DialogContent`
 * là con, không có quyền đó trực tiếp. "Thu nhỏ" cần TẮT `open` (để Radix nhả
 * scroll-lock/focus-trap, xem cho tương tác được trang phía sau) mà KHÔNG mất
 * state React bên trong (form đang nhập dở) — nên đi qua context này: `Content`
 * chỉ báo "tôi đang bị thu nhỏ" lên, `Dialog` gộp vào `effectiveOpen`.
 */
const DialogMinimizeContext = React.createContext<{
  isMinimized: boolean
  setIsMinimized: (v: boolean) => void
  /**
   * Modal này đã từng thật sự mở (open=true) ít nhất 1 lần chưa — quyết định
   * `DialogContent` có được phép `forceMount` (giữ trong DOM lúc thu nhỏ) hay
   * không. XEM Ở DialogContent để biết vì sao đây không phải chi tiết vặt.
   */
  hasOpenedOnce: boolean
  /**
   * "Có nên thấy được không" — gộp CẢ open thật lẫn tab-active lẫn minimized.
   * `DialogContent` dùng giá trị NÀY (không chỉ `isMinimized`) để tự ép
   * `display:none` bằng style inline. Bắt buộc phải gộp đủ 3 lý do: sau khi
   * `forceMount` bật (từ lần mở đầu tiên), Content ở lại DOM cả khi ĐÃ ĐÓNG
   * HẲN (không phải do thu nhỏ) — nếu chỉ dựa vào class animation
   * `data-closed:...` mà lớp CSS đó không có `display:none` ở khung hình
   * cuối, sẽ còn sót 1 lớp trong suốt vẫn nhận click, che khuất nội dung bên
   * dưới một cách âm thầm. Ép bằng style tránh hẳn rủi ro đó.
   */
  isVisible: boolean
  /**
   * Prop `open` GỐC (chưa gộp minimized/tab-active) — `DialogContent` cần giá
   * trị THẬT này (không phải `isVisible`) để biết khi nào modal ĐÓNG HẲN (phân
   * biệt với thu nhỏ, vốn cũng làm `isVisible=false` nhưng `open` vẫn `true`)
   * và reset `isMaximized` cục bộ của nó — không thì mở lại modal ở lần sau
   * sẽ kẹt nguyên trạng thái phóng to của lần trước.
   */
  rawOpen: boolean | undefined
}>({
  isMinimized: false,
  setIsMinimized: () => {},
  hasOpenedOnce: false,
  isVisible: false,
  rawOpen: undefined,
})

function Dialog({
  open,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  // Trang bị ẩn (đang ở tab khác) thì tạm ẩn luôn modal của nó. Modal render ra
  // thẳng document.body qua portal nên không bị CSS ẩn trang che — không chặn ở
  // đây thì modal của tab cũ sẽ nổi đè lên tab đang xem.
  //
  // Chỉ can thiệp khi modal được điều khiển bằng prop `open`: ta ép hiển thị
  // false chứ KHÔNG đụng vào state của trang, nên quay lại tab là modal hiện
  // lại nguyên chỗ đang dở. Modal không truyền `open` (tự quản lý) giữ nguyên
  // hành vi cũ.
  const isTabActive = useIsTabActive()
  const [isMinimized, setIsMinimized] = React.useState(false)
  const [hasOpenedOnce, setHasOpenedOnce] = React.useState(!!open)
  const effectiveOpen =
    open === undefined ? undefined : open && isTabActive && !isMinimized
  // Modal không dùng prop `open` (tự quản lý đóng/mở nội bộ) thì không có
  // thông tin gì để tính "có nên thấy được không" từ đây — coi như luôn
  // "visible" khi đã mount, y hệt hành vi mặc định cũ của Radix.
  const isVisible = open === undefined ? true : !!effectiveOpen

  React.useEffect(() => {
    if (open) setHasOpenedOnce(true)
    // Modal đóng hẳn từ bên ngoài (không phải do thu nhỏ) thì reset thu nhỏ
    // — lần mở sau không được kẹt ở trạng thái thu nhỏ của lần trước.
    if (open === false) setIsMinimized(false)
  }, [open])

  return (
    <DialogMinimizeContext.Provider
      value={{ isMinimized, setIsMinimized, hasOpenedOnce, isVisible, rawOpen: open }}
    >
      <DialogPrimitive.Root data-slot="dialog" open={effectiveOpen} {...props} />
    </DialogMinimizeContext.Provider>
  )
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-[100] bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  showWindowControls = true,
  windowTitle,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
  /** Tắt Thu nhỏ/Phóng to cho modal nhỏ (vd hộp xác nhận) mà chỉ cần nút Đóng. */
  showWindowControls?: boolean
  /** Tên hiện trên thanh nổi khi modal này bị thu nhỏ. */
  windowTitle?: string
}) {
  const { isMinimized, setIsMinimized, hasOpenedOnce, isVisible, rawOpen } =
    React.useContext(DialogMinimizeContext)
  const [isMaximized, setIsMaximized] = React.useState(false)
  const idRef = React.useRef(`dialog-${Math.random().toString(36).slice(2)}`)
  const register = useModalWindowStore((s) => s.register)
  const unregister = useModalWindowStore((s) => s.unregister)

  // Đóng HẲN (không phải thu nhỏ, `rawOpen` phân biệt được 2 trường hợp — xem
  // context) thì reset phóng to, để lần mở SAU luôn bắt đầu ở kích thước bình
  // thường thay vì kẹt nguyên trạng thái phóng to của lần mở trước.
  React.useEffect(() => {
    if (rawOpen === false) setIsMaximized(false)
  }, [rawOpen])

  const handleMinimize = () => {
    setIsMinimized(true)
    register({
      id: idRef.current,
      title: windowTitle || "Cửa sổ đang mở",
      restore: () => setIsMinimized(false),
    })
  }

  // Đã mở lại (bấm thanh nổi, hoặc đóng hẳn modal) thì rút khỏi danh sách
  // thanh nổi — nếu không thanh sẽ treo ở đó dù modal đã hiện lại/đã đóng.
  React.useEffect(() => {
    if (!isMinimized) unregister(idRef.current)
  }, [isMinimized, unregister])
  React.useEffect(() => () => unregister(idRef.current), [unregister])

  // CỐ Ý dùng style INLINE thay vì class Tailwind cho 2 trạng thái này: mỗi
  // modal gọi DialogContent đều tự truyền `className` riêng để định kích
  // thước (vd "w-[95vw] h-[92vh]") — `cn()` dùng tailwind-merge nên class
  // truyền vào SAU (của từng modal) LUÔN thắng class mặc định, kể cả khi ta
  // cố nhét class "phóng to" vào giữa. Style inline nằm ngoài cơ chế merge
  // đó, luôn thắng bất kể modal nào truyền className gì — cách duy nhất áp
  // dụng được nhất quán cho MỌI modal đang có sẵn trong app.
  const windowStyle: React.CSSProperties | undefined = !isVisible
    ? { display: "none" }
    : isMaximized
      ? {
          position: "fixed",
          inset: "1rem",
          top: "1rem",
          left: "1rem",
          right: "1rem",
          bottom: "1rem",
          width: "auto",
          height: "auto",
          maxWidth: "none",
          maxHeight: "none",
          transform: "none",
          // Tailwind v4 biên dịch `-translate-x-1/2 -translate-y-1/2` thành
          // thuộc tính CSS `translate` riêng (không phải `transform`) — phải
          // hủy riêng nó, không thì modal vẫn bị đẩy lệch theo công thức cũ
          // (căn giữa theo kích thước gốc trước khi phóng to).
          translate: "0",
        }
      : undefined

  return (
    <DialogPortal>
      {/* Overlay KHÔNG forceMount — Radix đã tự ẩn/unmount nó đúng theo
          `open` (không cần ta tự ẩn thêm gì, khác hẳn Content bên dưới). */}
      <DialogOverlay />
      <DialogPrimitive.Content
        // CHỈ forceMount SAU KHI modal đã thật sự mở ít nhất 1 lần. Bật sẵn
        // vô điều kiện sẽ khiến những modal LUÔN nằm sẵn trong cây React (rất
        // nhiều modal trong app render kiểu `<Dialog open={isOpen}>` chứ
        // không bọc `{isOpen && <Dialog>}`) bị Radix mount ngay từ đầu dù
        // isOpen=false — tuy bị ẩn nhưng đã fetch dữ liệu/chạy side-effect
        // bên trong sớm không cần thiết. Trước lần mở đầu tiên, forceMount để
        // undefined — HÀNH VI Y HỆT TRƯỚC ĐÂY, không đổi gì. Chốt 2026-09-10.
        forceMount={hasOpenedOnce || undefined}
        data-slot="dialog-content"
        style={windowStyle}
        className={cn(
          "fixed top-1/2 left-1/2 z-[100] grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-6 rounded-xl bg-popover p-6 text-sm text-popover-foreground ring-1 ring-foreground/10 duration-100 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          className
        )}
        {...props}
      >
        {children}
        {(showCloseButton || showWindowControls) && (
          <div className="absolute top-4 right-4 flex items-center gap-1">
            {showWindowControls && (
              <>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleMinimize}
                  title="Thu nhỏ"
                >
                  <Minus />
                  <span className="sr-only">Thu nhỏ</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setIsMaximized((v) => !v)}
                  title={isMaximized ? "Khôi phục kích thước" : "Phóng to"}
                >
                  {isMaximized ? <Minimize2 /> : <Maximize2 />}
                  <span className="sr-only">
                    {isMaximized ? "Khôi phục kích thước" : "Phóng to"}
                  </span>
                </Button>
              </>
            )}
            {showCloseButton && (
              <DialogPrimitive.Close data-slot="dialog-close" asChild>
                <Button variant="ghost" size="icon-sm" title="Đóng">
                  <XIcon />
                  <span className="sr-only">Close</span>
                </Button>
              </DialogPrimitive.Close>
            )}
          </div>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close asChild>
          <Button variant="outline">Close</Button>
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("font-heading leading-none font-medium", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
