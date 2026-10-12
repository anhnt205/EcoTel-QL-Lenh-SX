import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4 text-white" />
        ),
        info: (
          <InfoIcon className="size-4 text-white" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
          success: "!bg-blue-600 !text-white !border-blue-700 [&_[data-icon]]:!text-white [&_[data-title]]:!text-white [&_[data-description]]:!text-blue-100",
          info: "!bg-blue-600 !text-white !border-blue-700 [&_[data-icon]]:!text-white [&_[data-title]]:!text-white [&_[data-description]]:!text-blue-100",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
