"use client";

export default function CloseWindowButton() {
    const onClick = () => {
        if (window.opener && !window.opener.closed) window.close();
    };
    return (
        <button type="button" onClick={onClick}
                className="inline-flex w-max items-center gap-1 text-sm font-medium text-sky-700 hover:underline">
            ← Close window
        </button>
    );
}