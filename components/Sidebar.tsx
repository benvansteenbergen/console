"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    Bars3Icon,
    XMarkIcon,
    HomeIcon,
    ArrowRightOnRectangleIcon,
    PlusCircleIcon,
    ChevronDownIcon,
    ChevronRightIcon,
    FolderIcon,
    Cog6ToothIcon,
    ServerIcon,
    BoltIcon,
} from "@heroicons/react/24/outline";
import { useBranding } from "@/components/BrandingProvider";
import { useNavigation } from "@/components/NavigationProgress";
import useSWR, { useSWRConfig } from "swr";

interface ContentForm {
    id: string;
    slug: string;
    name: string;
    formUrl: string;
}

interface FolderStat {
    folder: string;
    unseen: number;
    items: unknown[];
}

interface UnreadCount {
    success: boolean;
    count: number;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const toSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export default function Sidebar() {
    const [open, setOpen] = useState(false);
    const [formsExpanded, setFormsExpanded] = useState(false);
    const [foldersExpanded, setFoldersExpanded] = useState(false);
    const pathname = usePathname();
    const router = useRouter();
    const branding = useBranding();
    const { startNavigation } = useNavigation();
    const { mutate } = useSWRConfig();
    const { data: forms } = useSWR<ContentForm[]>('/api/content-forms', fetcher);
    const { data: folders } = useSWR<FolderStat[]>('/api/content-storage', fetcher);
    const { data: unreadData } = useSWR<UnreadCount>('/api/live/unread-count', fetcher, {
        refreshInterval: 30000, // Refresh every 30 seconds
    });

    const liveUnreadCount = unreadData?.count || 0;

    const handleNavClick = (href: string) => {
        setOpen(false);
        if (pathname !== href) {
            startNavigation();
        }
    };

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            // Clear all SWR cache
            mutate(() => true, undefined, { revalidate: false });
            // Redirect to login
            router.push('/login');
        } catch (error) {
            console.error('Logout failed:', error);
            // Still redirect even if logout fails
            router.push('/login');
        }
    };

    const nav = [
        {href: "/dashboard", label: "Dashboard", icon: HomeIcon},
        {href: "/live", label: "Live", icon: BoltIcon},
        {href: "/company-private-storage", label: "Private Storage (beta)", icon: ServerIcon},
        {href: "/settings", label: "Settings", icon: Cog6ToothIcon},
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
                    {nav.map(({href, label, icon: Icon}) => {
                        const active = pathname === href;
                        const common =
                            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium";
                        const showBadge = href === '/live' && liveUnreadCount > 0;
                        return (
                            <Link
                                key={href}
                                href={href}
                                className={`${common} ${
                                    active
                                        ? "bg-blue-600 text-white"
                                        : "text-gray-600 hover:bg-gray-100"
                                }`}
                                onClick={() => handleNavClick(href)}
                            >
                                <Icon className="h-5 w-5"/>
                                <span className="flex-1">{label}</span>
                                {showBadge && (
                                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                                        active ? "bg-white text-blue-600" : "bg-blue-600 text-white"
                                    }`}>
                                        {liveUnreadCount > 99 ? '99+' : liveUnreadCount}
                                    </span>
                                )}
                            </Link>
                        );
                    })}

                    {/* Logout button */}
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
                    >
                        <ArrowRightOnRectangleIcon className="h-5 w-5"/>
                        Logout
                    </button>

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
                                    const formHref = `/create/${form.slug}`;
                                    const formActive = pathname.startsWith(formHref);
                                    return (
                                        <Link
                                            key={form.id}
                                            href={formHref}
                                            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
                                                formActive
                                                    ? "bg-blue-50 text-blue-600 font-medium"
                                                    : "text-gray-600 hover:bg-gray-50"
                                            }`}
                                            onClick={() => handleNavClick(formHref)}
                                        >
                                            {form.name}
                                        </Link>
                                    );
                                })
                            )}
                        </div>
                    )}

                    {/* Divider */}
                    <div className="my-2 border-t border-gray-200" />

                    {/* Content Folders section */}
                    <button
                        onClick={() => setFoldersExpanded(!foldersExpanded)}
                        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
                    >
                        <FolderIcon className="h-5 w-5" />
                        <span className="flex-1 text-left">Content Folders</span>
                        {foldersExpanded ? (
                            <ChevronDownIcon className="h-4 w-4" />
                        ) : (
                            <ChevronRightIcon className="h-4 w-4" />
                        )}
                    </button>

                    {/* Folders submenu */}
                    {foldersExpanded && (
                        <div className="ml-4 space-y-1">
                            {!folders ? (
                                <div className="px-3 py-2 text-xs text-gray-400">Loading...</div>
                            ) : folders.length === 0 ? (
                                <div className="px-3 py-2 text-xs text-gray-400">No folders available</div>
                            ) : (
                                folders.map((folder) => {
                                    const folderSlug = toSlug(folder.folder);
                                    const folderHref = `/content/${folderSlug}`;
                                    const folderActive = pathname.startsWith(folderHref);
                                    return (
                                        <Link
                                            key={folder.folder}
                                            href={folderHref}
                                            className={`flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm ${
                                                folderActive
                                                    ? "bg-blue-50 text-blue-600 font-medium"
                                                    : "text-gray-600 hover:bg-gray-50"
                                            }`}
                                            onClick={() => handleNavClick(folderHref)}
                                        >
                                            <span className="capitalize">{folder.folder}</span>
                                            {folder.unseen > 0 && (
                                                <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                                                    {folder.unseen}
                                                </span>
                                            )}
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