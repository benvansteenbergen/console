"use client";

export default function CloseWindowButton({
                                              label = "← Close window",
                                              className = "inline-flex w-max items-center gap-1 text-sm font-medium text-sky-700 hover:underline",
                                          }: { label?: string; className?: string }) {
    const onClick = () => {
        if (window.opener && !window.opener.closed) { window.close(); return; }
    };
    return <button type="button" onClick={onClick} className={className}>{label}</button>;
}