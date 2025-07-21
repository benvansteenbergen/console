
/* Sidebar.tsx --------------------------------------------------------- */
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Bars3Icon,
    XMarkIcon,
    HomeIcon,
    ClockIcon,
    ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";

export default function Sidebar() {
    const [open, setOpen] = useState(false);
    const pathname = usePathname();

    const nav = [
        {href: "/dashboard", label: "Dashboard", icon: HomeIcon},
        {href: "/executions", label: "Logboek", icon: ClockIcon},
        {
            href: "https://workflow.wingsuite.io",
            label: "Open n8n ↗",
            icon: ArrowTopRightOnSquareIcon,
            external: true,
        },
    ];

    return (
        <>
            {/* hamburger -------------------------------------------------------- */}
            <button
                className="m-3 rounded-md p-2 text-gray-700 hover:bg-gray-100 md:hidden"
                onClick={() => setOpen(true)}
            >
                <Bars3Icon className="h-6 w-6"/>
            </button>

            {/* overlay for mobile */}
            {open && (
                <div
                    className="fixed inset-0 z-30 bg-black/30 md:hidden"
                    onClick={() => setOpen(false)}
                />
            )}

            {/* sidebar ---------------------------------------------------------- */}
            <aside
                className={`fixed z-40 flex h-full w-60 flex-col rounded-r-2xl bg-white shadow-lg transition-transform md:static md:translate-x-0 ${
                    open ? "translate-x-0" : "-translate-x-full"
                }`}
            >
                {/* header */}
                <div className="flex items-center justify-between px-4 py-4">
                    <span className="text-lg font-bold">Wingsuite</span>
                    <button
                        className="rounded-md p-1 text-gray-700 hover:bg-gray-100 md:hidden"
                        onClick={() => setOpen(false)}
                    >
                        <XMarkIcon className="h-5 w-5"/>
                    </button>
                </div>

                {/* nav links */}
                <nav className="mt-2 flex flex-1 flex-col gap-1 px-3">
                    {nav.map(({href, label, icon: Icon, external}) => {
                        const active = pathname === href;
                        const common =
                            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium";
                        return external ? (
                            <a
                                key={href}
                                href={href}
                                target="_blank"
                                rel="noreferrer"
                                className={`${common} ${
                                    active
                                        ? "bg-blue-600 text-white"
                                        : "text-gray-600 hover:bg-gray-100"
                                }`}
                            >
                                <Icon className="h-5 w-5"/>
                                {label}
                            </a>
                        ) : (
                            <Link
                                key={href}
                                href={href}
                                className={`${common} ${
                                    active
                                        ? "bg-blue-600 text-white"
                                        : "text-gray-600 hover:bg-gray-100"
                                }`}
                                onClick={() => setOpen(false)}
                            >
                                <Icon className="h-5 w-5"/>
                                {label}
                            </Link>
                        );
                    })}
                </nav>
            </aside>
        </>
    );
}