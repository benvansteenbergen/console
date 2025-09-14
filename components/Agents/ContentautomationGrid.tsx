"use client";

import useSWR from "swr";
import Image from "next/image";

interface Automation {
    id: string;
    name: string;
    avatar: string;
    chatUrl: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ContentautomationGrid() {
    const { data, error } = useSWR<Automation[]>("/api/content-automations", fetcher);
    if (error) return <p className="p-4 text-red-600">No automations active</p>;

    return (
        <div className="grid grid-cols-2 gap-6 p-6 lg:grid-cols-4">
            {/* skeleton */}
    {!data &&
    Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-32 animate-pulse rounded-lg bg-gray-200" />
    ))}

    {data?.map((w) => (
        <div
            key={w.id}
        className="flex flex-col items-center gap-3 rounded-lg border bg-white p-4 shadow-sm"
        >
        <Image
            src={w.avatar}
        alt=""
        width={48}
        height={48}
        className="rounded-full"
        />
        <p className="text-center text-sm font-medium">{w.name}</p>
            <button
        className="w-full rounded border px-3 py-1 text-xs hover:bg-gray-50"
        onClick={() =>
        window.open(w.chatUrl, "_blank")
    }
    >
        Go to destination
        </button>
        </div>
    ))}
    </div>
);
}