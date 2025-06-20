// components/ui/button.tsx
import { ButtonHTMLAttributes, DetailedHTMLProps } from "react";

type Props = DetailedHTMLProps<
  ButtonHTMLAttributes<HTMLButtonElement>,
  HTMLButtonElement
> & {
  variant?: "default" | "outline";
};

export function Button({
  variant = "default",
  className = "",
  ...props
}: Props) {
  const base =
    "inline-flex h-11 items-center justify-center rounded-md px-4 text-sm font-medium transition-colors focus:outline-none";
  const styles =
    variant === "outline"
      ? "border border-neutral-300"
      : "bg-black text-white hover:bg-neutral-800";
  return <button className={`${base} ${styles} ${className}`} {...props} />;
}
