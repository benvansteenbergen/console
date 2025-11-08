'use client';

import { useEffect, useState } from 'react';

const interestingFacts = [
    "The human brain can process images 60,000 times faster than text.",
    "Honey never spoils – archaeologists found 3,000-year-old honey in Egyptian tombs that was still edible.",
    "Octopuses have three hearts and blue blood to help them survive in deep, cold ocean water.",
    "The shortest war in history lasted only 38 minutes between Britain and Zanzibar in 1896.",
    "A single strand of spider silk is five times stronger than steel of the same thickness."
];

export default function GlassLoader({ duration = 30000 }: { duration?: number }) {
    const [progress, setProgress] = useState(0);
    const [factIndex, setFactIndex] = useState(0);

    // Progress animation over 30 seconds
    useEffect(() => {
        const startTime = Date.now();
        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const newProgress = Math.min((elapsed / duration) * 100, 100);
            setProgress(newProgress);

            if (newProgress >= 100) {
                clearInterval(interval);
            }
        }, 50); // Update every 50ms for smooth animation

        return () => clearInterval(interval);
    }, [duration]);

    // Rotate facts every 6 seconds (30s / 5 facts)
    useEffect(() => {
        const factInterval = setInterval(() => {
            setFactIndex((prev) => (prev + 1) % interestingFacts.length);
        }, duration / interestingFacts.length);

        return () => clearInterval(factInterval);
    }, [duration]);

    // Calculate stroke dash for circular progress
    const circumference = 2 * Math.PI * 90; // radius = 90
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
        <div className="flex flex-col items-center justify-center gap-8">
            {/* Glass-style circular loader */}
            <div className="relative h-48 w-48">
                {/* Background glow */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400/20 to-purple-500/20 blur-2xl" />

                {/* Glass container */}
                <div className="relative flex h-full w-full items-center justify-center rounded-full backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl">
                    {/* SVG Progress Circle */}
                    <svg className="absolute inset-0 h-full w-full -rotate-90 transform">
                        {/* Background circle */}
                        <circle
                            cx="96"
                            cy="96"
                            r="90"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="none"
                            className="text-white/10"
                        />

                        {/* Progress circle with gradient */}
                        <defs>
                            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#3b82f6" />
                                <stop offset="50%" stopColor="#8b5cf6" />
                                <stop offset="100%" stopColor="#ec4899" />
                            </linearGradient>
                        </defs>
                        <circle
                            cx="96"
                            cy="96"
                            r="90"
                            stroke="url(#progressGradient)"
                            strokeWidth="8"
                            fill="none"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            className="transition-all duration-300 ease-out drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                        />
                    </svg>

                    {/* Percentage text */}
                    <div className="z-10 text-center">
                        <div className="text-4xl font-bold bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                            {Math.round(progress)}%
                        </div>
                        <div className="mt-1 text-xs font-medium text-gray-500">
                            Processing
                        </div>
                    </div>
                </div>
            </div>

            {/* Rotating interesting facts */}
            <div className="max-w-md text-center px-4">
                <p className="text-sm font-medium text-gray-400 mb-2">Did you know?</p>
                <p
                    key={factIndex}
                    className="text-base text-gray-700 animate-fade-in leading-relaxed"
                >
                    {interestingFacts[factIndex]}
                </p>
            </div>
        </div>
    );
}
