import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner";
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({
  ...props
}) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4 text-ms-pure" />
        ),
        info: (
          <InfoIcon className="size-4 text-ms-pure" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4 text-ms-pure" />
        ),
        error: (
          <OctagonXIcon className="size-4 text-ms-pure" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin text-ms-pure" />
        ),
      }}
      toastOptions={{
        classNames: {
          toast: "group toast group-[.toaster]:bg-ms-elevated group-[.toaster]:text-ms-pure group-[.toaster]:border-ms-border group-[.toaster]:shadow-2xl group-[.toaster]:rounded-2xl group-[.toaster]:backdrop-blur-xl group-[.toaster]:p-4",
          description: "group-[.toast]:text-ms-muted",
          actionButton: "group-[.toast]:bg-ms-pure group-[.toast]:text-ms-black",
          cancelButton: "group-[.toast]:bg-ms-surface group-[.toast]:text-ms-muted",
          success: "group-[.toaster]:border-ms-border group-[.toaster]:bg-ms-elevated",
          error: "group-[.toaster]:border-ms-border group-[.toaster]:bg-ms-elevated",
        },
      }}
      {...props} />
  );
}

export { Toaster }
