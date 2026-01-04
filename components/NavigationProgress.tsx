"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { usePathname } from "next/navigation";

interface NavigationContextType {
    startNavigation: () => void;
}

const NavigationContext = createContext<NavigationContextType>({
    startNavigation: () => {},
});

export function useNavigation() {
    return useContext(NavigationContext);
}

export function NavigationProgressProvider({ children }: { children: React.ReactNode }) {
    const [isNavigating, setIsNavigating] = useState(false);
    const [progress, setProgress] = useState(0);
    const pathname = usePathname();

    const startNavigation = useCallback(() => {
        setIsNavigating(true);
        setProgress(0);
    }, []);

    // Animate progress
    useEffect(() => {
        if (!isNavigating) return;

        const steps = [
            { delay: 50, value: 30 },
            { delay: 300, value: 50 },
            { delay: 600, value: 70 },
            { delay: 1000, value: 85 },
            { delay: 1500, value: 92 },
        ];

        const timeouts = steps.map(({ delay, value }) =>
            setTimeout(() => setProgress(value), delay)
        );

        return () => timeouts.forEach(clearTimeout);
    }, [isNavigating]);

    // When pathname changes, navigation is complete
    useEffect(() => {
        if (isNavigating) {
            setProgress(100);
            const timeout = setTimeout(() => {
                setIsNavigating(false);
                setProgress(0);
            }, 200);
            return () => clearTimeout(timeout);
        }
    }, [pathname]);

    return (
        <NavigationContext.Provider value={{ startNavigation }}>
            {/* Progress bar */}
            {isNavigating && (
                <div className="fixed top-0 left-0 right-0 z-[200] h-1 bg-blue-100 overflow-hidden">
                    <div
                        className="h-full bg-blue-600 transition-all duration-300 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}
            {children}
        </NavigationContext.Provider>
    );
}
