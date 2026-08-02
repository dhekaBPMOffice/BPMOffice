import * as React from "react";
import { cn } from "@/lib/utils";

function RequiredMark({ className }: { className?: string }) {
  return (
    <span
      className={cn("ml-1 inline font-semibold leading-none", className)}
      aria-hidden="true"
    >
      *
    </span>
  );
}

type LabelProps = Omit<React.LabelHTMLAttributes<HTMLLabelElement>, "required"> & {
  /** Exibe asterisco de campo obrigatório ao lado do rótulo. */
  required?: boolean;
};

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
          className
        )}
        {...props}
      >
        {children}
        {required ? <RequiredMark /> : null}
      </label>
    );
  }
);
Label.displayName = "Label";

export { Label, RequiredMark };
