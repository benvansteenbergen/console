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
    PlusCircleIcon,
    ChevronDownIcon,
    ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { useBranding } from "@/components/BrandingProvider";
import useSWR from "swr";

interface ContentForm {
    id: string;
    name: string;
    formUrl: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function Sidebar() {
    const [open, setOpen] = useState(false);
    const [formsExpanded, setFormsExpanded] = useState(true);
    const pathname = usePathname();
    const branding = useBranding();
    const { data: forms } = useSWR<ContentForm[]>('/api/content-forms', fetcher);

    const nav = [
        {href: "/dashboard", label: "Dashboard", icon: HomeIcon},
        {href: "/executions", label: "Logboek", icon: ClockIcon},
        {
            href: `https://${branding.domain}/login`,
            label: "Logout ↗",
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
                    <img src={branding.logo} alt={branding.name} width={200} height={48} />
                    <button
                        className="rounded-md p-1 text-gray-700 hover:bg-gray-100 md:hidden"
                        onClick={() => setOpen(false)}
                    >
                        <XMarkIcon className="h-5 w-5"/>
                    </button>
                </div>

                {/* nav links */}
                <nav className="mt-2 flex flex-1 flex-col gap-1 px-3 overflow-y-auto">
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

                    {/* Divider */}
                    <div className="my-2 border-t border-gray-200" />

                    {/* Create section with collapsible forms */}
                    <button
                        onClick={() => setFormsExpanded(!formsExpanded)}
                        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
                    >
                        <PlusCircleIcon className="h-5 w-5" />
                        <span className="flex-1 text-left">Create</span>
                        {formsExpanded ? (
                            <ChevronDownIcon className="h-4 w-4" />
                        ) : (
                            <ChevronRightIcon className="h-4 w-4" />
                        )}
                    </button>

                    {/* Forms submenu */}
                    {formsExpanded && (
                        <div className="ml-4 space-y-1">
                            {!forms ? (
                                <div className="px-3 py-2 text-xs text-gray-400">Loading...</div>
                            ) : forms.length === 0 ? (
                                <div className="px-3 py-2 text-xs text-gray-400">No forms available</div>
                            ) : (
                                forms.map((form) => {
                                    const formActive = pathname.startsWith(`/create/${form.id}`);
                                    return (
                                        <Link
                                            key={form.id}
                                            href={`/create/${form.id}`}
                                            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
                                                formActive
                                                    ? "bg-blue-50 text-blue-600 font-medium"
                                                    : "text-gray-600 hover:bg-gray-50"
                                            }`}
                                            onClick={() => setOpen(false)}
                                        >
                                            {form.name}
                                        </Link>
                                    );
                                })
                            )}
                        </div>
                    )}
                </nav>
            </aside>
        </>
    );
}