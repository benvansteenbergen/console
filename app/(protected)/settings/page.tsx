// app/(protected)/settings/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "@/components/SessionProvider";
import { useBranding } from "@/components/BrandingProvider";
import { useRouter } from "next/navigation";
import useSWR from "swr";

interface SettingsData {
    client: {
        name: string;
        domain: string;
        signedUpSince: string;
    };
    user: {
        email: string;
        role: string;
        plan: string;
    };
    counts: {
        activeForms: number;
        activeAgents: number;
        activeAutomations: number;
    };
    dataSources: {
        linkedinPersonal: {
            connected: boolean;
            lastSynced?: string;
            profileName?: string;
        };
        linkedinCompany: {
            connected: boolean;
            lastSynced?: string;
            slug?: string;
        };
        website: {
            connected: boolean;
            lastSynced?: string;
            url?: string;
        };
    };
}

interface CreditsData {
    plan: string;
    credits_used: number;
    plan_credits: number;
    over_limit: boolean;
}

interface LinkedInProfile {
    full_name: string;
    headline: string;
    location: string;
    industry: string | null;
    connection_count: string;
    follower_count: string | null;
    about: string;
    recent_activity?: {
        posts: Array<{
            content: string;
            type: string;
            engagement: string | null;
            date: string | null;
        }>;
        activity_summary: string;
    };
    profile_summary: string;
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function SettingsPage() {
    const { loading: sessionLoading } = useSession();
    const branding = useBranding();
    const router = useRouter();

    const { data: settings, error: settingsError, mutate: mutateSettings } = useSWR<SettingsData>(
        "/api/settings",
        fetcher,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
        }
    );

    const { data: credits } = useSWR<CreditsData>(
        "/api/credits",
        fetcher,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
        }
    );

    // Connection states
    const [connectingLinkedinCompany, setConnectingLinkedinCompany] = useState(false);
    const [connectingWebsite, setConnectingWebsite] = useState(false);

    const [linkedinCompanySlug, setLinkedinCompanySlug] = useState('');
    const [websiteUrl, setWebsiteUrl] = useState('');

    const [showLinkedinCompanyInput, setShowLinkedinCompanyInput] = useState(false);
    const [showWebsiteInput, setShowWebsiteInput] = useState(false);
    const [showLinkedinProfileView, setShowLinkedinProfileView] = useState(false);
    const [linkedinProfile, setLinkedinProfile] = useState<LinkedInProfile | null>(null);
    const [loadingLinkedinProfile, setLoadingLinkedinProfile] = useState(false);

    // Scroll capture states
    // Flow: idle -> intro -> previewing -> validating -> ready -> capturing -> done -> processing -> result
    const [scrollCaptureMode, setScrollCaptureMode] = useState<'idle' | 'intro' | 'previewing' | 'validating' | 'ready' | 'capturing' | 'done' | 'processing' | 'result'>('idle');
    const [capturedFrames, setCapturedFrames] = useState<string[]>([]);
    const [validationResult, setValidationResult] = useState<{ isLinkedIn: boolean; detectedName?: string } | null>(null);
    const [scrollCaptureInterval, setScrollCaptureInterval] = useState<NodeJS.Timeout | null>(null);
    const [noChangeCount, setNoChangeCount] = useState(0);
    const [videoReady, setVideoReady] = useState(false);
    const [profileResult, setProfileResult] = useState<{
        full_name: string;
        headline: string;
        location: string;
        industry: string | null;
        connection_count: string;
        follower_count: string | null;
        about: string;
        recent_activity?: {
            posts: Array<{
                content: string;
                type: string;
                engagement: string | null;
                date: string | null;
            }>;
            activity_summary: string;
        };
        profile_summary: string;
    } | null>(null);

    // Refs for interval callback (to avoid stale closure)
    const lastFrameDataRef = useRef<ImageData | null>(null);
    const activeVideoRef = useRef<HTMLVideoElement | null>(null);
    const noChangeCountRef = useRef(0);

    useEffect(() => {
        document.title = `${branding.name} - Settings`;
    }, [branding.name]);

    // Use ref for stream to avoid cleanup issues
    const activeStreamRef = useRef<MediaStream | null>(null);

    // Cleanup on unmount only
    useEffect(() => {
        return () => {
            if (activeStreamRef.current) {
                activeStreamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    if (sessionLoading || !settings) {
        return (
            <main className="flex flex-1 items-center justify-center p-6">
                <div className="text-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
                    <p className="text-sm text-gray-600">Loading settings...</p>
                </div>
            </main>
        );
    }

    if (settingsError) {
        return (
            <main className="flex flex-1 items-center justify-center p-6">
                <div className="text-center">
                    <p className="text-red-600">Failed to load settings</p>
                </div>
            </main>
        );
    }

    const usagePercent = credits
        ? Math.min((credits.credits_used / credits.plan_credits) * 100, 100)
        : 0;

    const handleConnectLinkedinCompany = async () => {
        if (!linkedinCompanySlug.trim()) return;

        setConnectingLinkedinCompany(true);
        try {
            const response = await fetch('/api/datasources/linkedin-company', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slug: linkedinCompanySlug }),
            });

            if (response.ok) {
                await mutateSettings();
                setShowLinkedinCompanyInput(false);
                setLinkedinCompanySlug('');
            }
        } catch (error) {
            console.error('Failed to connect LinkedIn company:', error);
        } finally {
            setConnectingLinkedinCompany(false);
        }
    };

    const handleConnectWebsite = async () => {
        if (!websiteUrl.trim()) return;

        setConnectingWebsite(true);
        try {
            const response = await fetch('/api/datasources/website', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: websiteUrl }),
            });

            if (response.ok) {
                await mutateSettings();
                setShowWebsiteInput(false);
                setWebsiteUrl('');
            }
        } catch (error) {
            console.error('Failed to connect website:', error);
        } finally {
            setConnectingWebsite(false);
        }
    };

    
    // Helper to capture a single frame from video (with compression)
    const captureFrameFromVideo = (video: HTMLVideoElement): { dataUrl: string; imageData: ImageData } | null => {
        // Ensure video is ready and has valid dimensions
        if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
            return null;
        }

        // Scale down if image is very large (max 1920px width)
        const maxWidth = 1920;
        let width = video.videoWidth;
        let height = video.videoHeight;

        if (width > maxWidth) {
            const scale = maxWidth / width;
            width = maxWidth;
            height = Math.round(height * scale);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        ctx.drawImage(video, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        // Use JPEG with 0.7 quality for significant compression
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        return { dataUrl, imageData };
    };

    // Compare two frames to detect significant change (returns percentage of different pixels)
    const compareFrames = (frame1: ImageData, frame2: ImageData): number => {
        if (frame1.width !== frame2.width || frame1.height !== frame2.height) return 100;

        const data1 = frame1.data;
        const data2 = frame2.data;
        let diffPixels = 0;
        const totalPixels = frame1.width * frame1.height;

        // Sample every 10th pixel for performance
        for (let i = 0; i < data1.length; i += 40) {
            const rDiff = Math.abs(data1[i] - data2[i]);
            const gDiff = Math.abs(data1[i + 1] - data2[i + 1]);
            const bDiff = Math.abs(data1[i + 2] - data2[i + 2]);

            // Consider pixel different if any channel differs by more than 30
            if (rDiff > 30 || gDiff > 30 || bDiff > 30) {
                diffPixels++;
            }
        }

        return (diffPixels / (totalPixels / 10)) * 100;
    };

    // Fetch and show LinkedIn profile
    const viewLinkedinProfile = async () => {
        setShowLinkedinProfileView(true);
        setLoadingLinkedinProfile(true);

        try {
            const response = await fetch('/api/datasources/linkedin-profile');
            if (response.ok) {
                const data = await response.json();
                setLinkedinProfile(data);
            } else {
                console.error('Failed to fetch LinkedIn profile');
            }
        } catch (error) {
            console.error('Error fetching LinkedIn profile:', error);
        } finally {
            setLoadingLinkedinProfile(false);
        }
    };

    // Start scroll capture flow - show intro modal first
    const startScrollCapture = () => {
        setScrollCaptureMode('intro');
        setCapturedFrames([]);
        setValidationResult(null);
        lastFrameDataRef.current = null;
        noChangeCountRef.current = 0;
        setNoChangeCount(0);
        setVideoReady(false);

        // Clean up any existing stream
        if (activeStreamRef.current) {
            activeStreamRef.current.getTracks().forEach(track => track.stop());
            activeStreamRef.current = null;
        }
        activeVideoRef.current = null;
    };

    // Open the share picker after intro
    const openSharePicker = async () => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    displaySurface: 'window'
                },
                audio: false,
                // @ts-expect-error - Chrome-specific: hide screen and tab options
                monitorTypeSurfaces: 'exclude',
                selfBrowserSurface: 'exclude',
            });

            // Store stream - the modal video element will use it
            activeStreamRef.current = stream;
            setVideoReady(true);
            setScrollCaptureMode('previewing');
        } catch (error) {
            console.error('Scroll capture failed:', error);
            setScrollCaptureMode('idle');
            alert('Failed to start screen capture. Please try again.');
        }
    };

    // User confirms this is their LinkedIn page - validate and proceed
    const confirmLinkedInPage = async () => {
        if (!activeVideoRef.current) return;

        setScrollCaptureMode('validating');

        // Capture frame and validate
        const frameResult = captureFrameFromVideo(activeVideoRef.current);
        if (!frameResult) {
            setValidationResult({ isLinkedIn: false, detectedName: 'Failed to capture screenshot' });
            setScrollCaptureMode('previewing');
            return;
        }

        // Store first frame
        setCapturedFrames([frameResult.dataUrl]);
        lastFrameDataRef.current = frameResult.imageData;

        try {
            // Send to validation endpoint
            const response = await fetch(frameResult.dataUrl);
            const blob = await response.blob();

            const formData = new FormData();
            formData.append('screenshot', blob, 'validation.jpg');

            const validateResponse = await fetch('/api/datasources/linkedin-validate', {
                method: 'POST',
                body: formData,
            });

            if (validateResponse.ok) {
                const result = await validateResponse.json();

                if (result.is_linkedin_profile) {
                    setValidationResult({ isLinkedIn: true, detectedName: result.reason || 'LinkedIn profile detected' });
                    setScrollCaptureMode('ready');
                } else {
                    setValidationResult({ isLinkedIn: false, detectedName: result.reason || 'Not a LinkedIn profile' });
                    setScrollCaptureMode('previewing');
                }
            } else {
                setValidationResult({ isLinkedIn: false, detectedName: 'Validation failed. Please try again.' });
                setScrollCaptureMode('previewing');
            }
        } catch (error) {
            console.error('Validation error:', error);
            setValidationResult({ isLinkedIn: false, detectedName: 'Validation failed. Please try again.' });
            setScrollCaptureMode('previewing');
        }
    };

    // Begin continuous capture while user scrolls
    const beginScrollCapture = () => {
        if (!activeVideoRef.current || !lastFrameDataRef.current) return;

        setScrollCaptureMode('capturing');
        noChangeCountRef.current = 0;
        let hasScrolledOnce = false;

        const interval = setInterval(async () => {
            const video = activeVideoRef.current;
            if (!video) return;

            // Check if stream is still active
            const stream = video.srcObject as MediaStream;
            if (stream) {
                const tracks = stream.getVideoTracks();
                if (tracks.length === 0 || tracks[0].readyState === 'ended') {
                    return;
                }
            }

            // Ensure video is still playing
            if (video.paused) {
                await video.play();
            }

            const frameResult = captureFrameFromVideo(video);
            if (!frameResult) return;

            // Compare with last frame
            const lastFrame = lastFrameDataRef.current;
            const diffPercent = lastFrame ? compareFrames(lastFrame, frameResult.imageData) : 100;

            if (diffPercent > 5) {
                // Significant change - new content visible
                setCapturedFrames(prev => [...prev, frameResult.dataUrl]);
                lastFrameDataRef.current = frameResult.imageData;
                noChangeCountRef.current = 0;
                setNoChangeCount(0);
                hasScrolledOnce = true;
            } else {
                // No significant change - only count if user has scrolled at least once
                if (hasScrolledOnce) {
                    noChangeCountRef.current += 1;
                    setNoChangeCount(noChangeCountRef.current);
                    // If no change for 8 consecutive checks (2 seconds at 250ms), user likely done scrolling
                    if (noChangeCountRef.current >= 8) {
                        // Stop the interval and stream
                        clearInterval(interval);
                        setScrollCaptureInterval(null);
                        if (activeStreamRef.current) {
                            activeStreamRef.current.getTracks().forEach(track => track.stop());
                            activeStreamRef.current = null;
                        }
                        activeVideoRef.current = null;
                        setScrollCaptureMode('done');
                    }
                }
            }
        }, 250);

        setScrollCaptureInterval(interval);
    };

    // Stop scroll capture
    const stopScrollCapture = () => {
        if (scrollCaptureInterval) {
            clearInterval(scrollCaptureInterval);
            setScrollCaptureInterval(null);
        }
        if (activeStreamRef.current) {
            activeStreamRef.current.getTracks().forEach(track => track.stop());
            activeStreamRef.current = null;
        }
        activeVideoRef.current = null;
        setScrollCaptureMode('done');
    };

    // Cancel scroll capture entirely
    const cancelScrollCapture = () => {
        if (scrollCaptureInterval) {
            clearInterval(scrollCaptureInterval);
            setScrollCaptureInterval(null);
        }
        if (activeStreamRef.current) {
            activeStreamRef.current.getTracks().forEach(track => track.stop());
            activeStreamRef.current = null;
        }
        activeVideoRef.current = null;
        setScrollCaptureMode('idle');
        setCapturedFrames([]);
        setValidationResult(null);
        lastFrameDataRef.current = null;
        noChangeCountRef.current = 0;
        setNoChangeCount(0);
        setVideoReady(false);
    };

    // Upload multiple frames
    const uploadScrollCapture = async () => {
        if (capturedFrames.length === 0) return;

        setScrollCaptureMode('processing');
        try {
            const formData = new FormData();

            // Convert each frame to blob and append
            for (let i = 0; i < capturedFrames.length; i++) {
                const response = await fetch(capturedFrames[i]);
                const blob = await response.blob();
                formData.append('screenshots', blob, `linkedin-profile-${i}.jpg`);
            }

            const uploadResponse = await fetch('/api/datasources/linkedin-screenshot', {
                method: 'POST',
                body: formData,
            });

            if (uploadResponse.ok) {
                const data = await uploadResponse.json();
                // Parse the output if it's a string (from n8n)
                const profileData = typeof data.output === 'string' ? JSON.parse(data.output) : data.output || data;
                setProfileResult(profileData);
                setScrollCaptureMode('result');
                await mutateSettings();
            } else {
                alert('Failed to process screenshots. Please try again.');
                setScrollCaptureMode('done');
            }
        } catch (error) {
            console.error('Failed to upload screenshots:', error);
            alert('Failed to upload screenshots. Please try again.');
            setScrollCaptureMode('done');
        }
    };

    // Close result modal and reset
    const closeResultModal = () => {
        setScrollCaptureMode('idle');
        setCapturedFrames([]);
        setValidationResult(null);
        setProfileResult(null);
        lastFrameDataRef.current = null;
        noChangeCountRef.current = 0;
        setNoChangeCount(0);
        setVideoReady(false);
    };

    return (
        <main className="flex flex-1 flex-col p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
                <button
                    onClick={() => router.push('/admin')}
                    className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700"
                >
                    Manage Agents
                </button>
            </div>

            {/* Two-column layout */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Organization Card */}
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                            <svg
                                className="h-6 w-6 text-blue-600"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                                />
                            </svg>
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900">Organization</h2>
                    </div>
                    <dl className="space-y-3">
                        <div>
                            <dt className="text-xs font-medium text-gray-500 uppercase">Name</dt>
                            <dd className="mt-1 text-sm text-gray-900">{settings.client.name}</dd>
                        </div>
                        <div>
                            <dt className="text-xs font-medium text-gray-500 uppercase">Domain</dt>
                            <dd className="mt-1 text-sm text-gray-900">{settings.client.domain}</dd>
                        </div>
                        <div>
                            <dt className="text-xs font-medium text-gray-500 uppercase">Member Since</dt>
                            <dd className="mt-1 text-sm text-gray-900">
                                {new Date(settings.client.signedUpSince).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </dd>
                        </div>
                        <div className="border-t border-gray-200 pt-3 mt-3">
                            <dt className="text-xs font-medium text-gray-500 uppercase mb-2">Data Sources</dt>
                            <dd className="space-y-1.5">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-700">LinkedIn Company</span>
                                    <span className={`text-xs font-medium ${settings.dataSources.linkedinCompany.connected ? 'text-green-600' : 'text-gray-400'}`}>
                                        {settings.dataSources.linkedinCompany.connected ? '✓ Connected' : '✗ Not Connected'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-700">Company Website</span>
                                    <span className={`text-xs font-medium ${settings.dataSources.website.connected ? 'text-green-600' : 'text-gray-400'}`}>
                                        {settings.dataSources.website.connected ? '✓ Connected' : '✗ Not Connected'}
                                    </span>
                                </div>
                            </dd>
                        </div>
                    </dl>
                </div>

                {/* Your Account Card */}
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                            <svg
                                className="h-6 w-6 text-green-600"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                />
                            </svg>
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900">Your Account</h2>
                    </div>
                    <dl className="space-y-3">
                        <div>
                            <dt className="text-xs font-medium text-gray-500 uppercase">Email</dt>
                            <dd className="mt-1 text-sm text-gray-900">{settings.user.email}</dd>
                        </div>
                        <div>
                            <dt className="text-xs font-medium text-gray-500 uppercase">Role</dt>
                            <dd className="mt-1">
                                <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                                    {settings.user.role}
                                </span>
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs font-medium text-gray-500 uppercase">Plan</dt>
                            <dd className="mt-1">
                                <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800">
                                    {settings.user.plan}
                                </span>
                            </dd>
                        </div>
                        <div className="border-t border-gray-200 pt-3 mt-3">
                            <dt className="text-xs font-medium text-gray-500 uppercase mb-2">Data Sources</dt>
                            <dd className="space-y-1.5">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-700">LinkedIn Profile</span>
                                    <span className={`text-xs font-medium ${settings.dataSources.linkedinPersonal.connected ? 'text-green-600' : 'text-gray-400'}`}>
                                        {settings.dataSources.linkedinPersonal.connected ? '✓ Connected' : '✗ Not Connected'}
                                    </span>
                                </div>
                            </dd>
                        </div>
                    </dl>
                </div>
            </div>

            {/* Active Tools Card */}
            <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-blue-50 to-purple-50 p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                        <svg
                            className="h-6 w-6 text-purple-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z"
                            />
                        </svg>
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">Active Tools</h2>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                    <div className="flex items-center gap-3 rounded-lg bg-white/50 p-4 backdrop-blur-sm">
                        <div className="text-2xl">📝</div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{settings.counts.activeForms}</p>
                            <p className="text-xs text-gray-600">Forms</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-lg bg-white/50 p-4 backdrop-blur-sm">
                        <div className="text-2xl">🤖</div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{settings.counts.activeAgents}</p>
                            <p className="text-xs text-gray-600">Agents</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-lg bg-white/50 p-4 backdrop-blur-sm">
                        <div className="text-2xl">⚡</div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{settings.counts.activeAutomations}</p>
                            <p className="text-xs text-gray-600">Automations</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Usage & Credits Card */}
            {credits && credits.credits_used !== undefined && credits.plan_credits !== undefined && (
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100">
                            <svg
                                className="h-6 w-6 text-yellow-600"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M13 10V3L4 14h7v7l9-11h-7z"
                                />
                            </svg>
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900">Usage & Credits</h2>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Credits Used</span>
                            <span className="font-semibold text-gray-900">
                                {(credits.credits_used || 0).toLocaleString()} / {(credits.plan_credits || 0).toLocaleString()}
                            </span>
                        </div>
                        <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
                            <div
                                className={`h-full transition-all ${
                                    credits.over_limit
                                        ? "bg-red-600"
                                        : usagePercent > 80
                                        ? "bg-yellow-500"
                                        : "bg-green-500"
                                }`}
                                style={{ width: `${usagePercent}%` }}
                            />
                        </div>
                        <p className="text-xs text-gray-500">
                            {credits.over_limit
                                ? "⚠️ You have exceeded your plan limit"
                                : `${Math.round(100 - usagePercent)}% remaining`}
                        </p>
                    </div>
                </div>
            )}

            {/* Data Sources Card */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100">
                        <svg
                            className="h-6 w-6 text-indigo-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
                            />
                        </svg>
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">Data Sources</h2>
                </div>

                <div className="space-y-6">
                    {/* LinkedIn Personal */}
                    <div className="border-b border-gray-200 pb-6 last:border-b-0 last:pb-0">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900">LinkedIn Profile</h3>
                                <p className="text-xs text-gray-500 mt-0.5">Connect your personal LinkedIn profile</p>
                            </div>
                            {settings.dataSources.linkedinPersonal.connected && settings.dataSources.linkedinPersonal.lastSynced && (
                                <span className="text-xs text-gray-500">
                                    Last synced: {new Date(settings.dataSources.linkedinPersonal.lastSynced).toLocaleDateString()}
                                </span>
                            )}
                        </div>

                        {settings.dataSources.linkedinPersonal.connected ? (
                            <div className="flex items-center gap-3">
                                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-600">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Captured
                                </span>
                                <button
                                    onClick={viewLinkedinProfile}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                                    title="View profile"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                    View
                                </button>
                                <button
                                    onClick={startScrollCapture}
                                    disabled={scrollCaptureMode !== 'idle'}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
                                    title="Recapture profile"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    {scrollCaptureMode !== 'idle' ? 'Capturing...' : 'Recapture'}
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={startScrollCapture}
                                disabled={scrollCaptureMode !== 'idle'}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-100 disabled:text-gray-400"
                            >
                                {scrollCaptureMode !== 'idle' ? 'Capturing...' : 'Capture Profile'}
                            </button>
                        )}
                    </div>

                    {/* LinkedIn Company */}
                    <div className="border-b border-gray-200 pb-6 last:border-b-0 last:pb-0">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900">LinkedIn Company Page</h3>
                                <p className="text-xs text-gray-500 mt-0.5">Connect your company LinkedIn page</p>
                            </div>
                            {settings.dataSources.linkedinCompany.connected && settings.dataSources.linkedinCompany.lastSynced && (
                                <span className="text-xs text-gray-500">
                                    Last synced: {new Date(settings.dataSources.linkedinCompany.lastSynced).toLocaleDateString()}
                                </span>
                            )}
                        </div>

                        {!showLinkedinCompanyInput ? (
                            <button
                                onClick={() => setShowLinkedinCompanyInput(true)}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                            >
                                {settings.dataSources.linkedinCompany.connected ? 'Reconnect' : 'Connect'}
                            </button>
                        ) : (
                            <div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={linkedinCompanySlug}
                                        onChange={(e) => setLinkedinCompanySlug(e.target.value)}
                                        placeholder="acme-corporation"
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        disabled={connectingLinkedinCompany}
                                    />
                                    <button
                                        onClick={handleConnectLinkedinCompany}
                                        disabled={connectingLinkedinCompany || !linkedinCompanySlug.trim()}
                                        className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                                    >
                                        {connectingLinkedinCompany ? 'Connecting...' : 'Save'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowLinkedinCompanyInput(false);
                                            setLinkedinCompanySlug('');
                                        }}
                                        disabled={connectingLinkedinCompany}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 mt-1.5">
                                    Enter your company slug from linkedin.com/company/<span className="font-medium">company-name</span>
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Website */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900">Company Website</h3>
                                <p className="text-xs text-gray-500 mt-0.5">Connect your company website</p>
                            </div>
                            {settings.dataSources.website.connected && settings.dataSources.website.lastSynced && (
                                <span className="text-xs text-gray-500">
                                    Last synced: {new Date(settings.dataSources.website.lastSynced).toLocaleDateString()}
                                </span>
                            )}
                        </div>

                        {!showWebsiteInput ? (
                            <button
                                onClick={() => setShowWebsiteInput(true)}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                            >
                                {settings.dataSources.website.connected ? 'Reconnect' : 'Connect'}
                            </button>
                        ) : (
                            <div>
                                <div className="flex gap-2">
                                    <input
                                        type="url"
                                        value={websiteUrl}
                                        onChange={(e) => setWebsiteUrl(e.target.value)}
                                        placeholder="https://yourcompany.com"
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        disabled={connectingWebsite}
                                    />
                                    <button
                                        onClick={handleConnectWebsite}
                                        disabled={connectingWebsite || !websiteUrl.trim()}
                                        className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                                    >
                                        {connectingWebsite ? 'Connecting...' : 'Save'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowWebsiteInput(false);
                                            setWebsiteUrl('');
                                        }}
                                        disabled={connectingWebsite}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 mt-1.5">
                                    Enter your full website URL including https://
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Scroll Capture Modal */}
            {scrollCaptureMode !== 'idle' && (
                <div className="fixed top-0 left-0 w-[100vw] h-[100vh] z-[100] flex items-center justify-center bg-black/50 p-4" style={{ margin: 0 }}>
                    <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="p-6 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">
                                {scrollCaptureMode === 'intro' && 'Capture your LinkedIn Profile'}
                                {scrollCaptureMode === 'previewing' && 'Is this your LinkedIn profile?'}
                                {scrollCaptureMode === 'validating' && 'Validating...'}
                                {scrollCaptureMode === 'ready' && 'Ready to capture'}
                                {scrollCaptureMode === 'capturing' && 'Capturing Profile...'}
                                {scrollCaptureMode === 'done' && 'Capture Complete'}
                                {scrollCaptureMode === 'processing' && 'Analyzing Profile...'}
                                {scrollCaptureMode === 'result' && 'Profile Scanned'}
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">
                                {scrollCaptureMode === 'intro' && 'We\'ll scan your LinkedIn profile to personalize your content'}
                                {scrollCaptureMode === 'previewing' && 'Confirm this is your LinkedIn profile page to continue'}
                                {scrollCaptureMode === 'validating' && 'Checking if this is a LinkedIn page...'}
                                {scrollCaptureMode === 'ready' && 'Go to your LinkedIn tab and scroll slowly from top to bottom'}
                                {scrollCaptureMode === 'capturing' && 'Scroll slowly through your entire profile. We\'ll capture as you go.'}
                                {scrollCaptureMode === 'done' && `Captured ${capturedFrames.length} section${capturedFrames.length !== 1 ? 's' : ''} of your profile`}
                                {scrollCaptureMode === 'processing' && 'Our AI is extracting your profile information...'}
                                {scrollCaptureMode === 'result' && 'Here\'s what we found on your LinkedIn profile'}
                            </p>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-hidden flex">
                            {/* Main preview area */}
                            <div className="flex-1 overflow-auto p-6">
                                {/* Intro explanation */}
                                {scrollCaptureMode === 'intro' && (
                                    <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
                                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                                            <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        </div>
                                        <h4 className="text-xl font-semibold text-gray-900 mb-3">How it works</h4>
                                        <div className="max-w-md space-y-4 text-left">
                                            <div className="flex gap-3">
                                                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">1</span>
                                                <p className="text-gray-600">Select the <strong>browser window</strong> with your LinkedIn profile open</p>
                                            </div>
                                            <div className="flex gap-3">
                                                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">2</span>
                                                <p className="text-gray-600">Confirm it's your LinkedIn profile page</p>
                                            </div>
                                            <div className="flex gap-3">
                                                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">3</span>
                                                <p className="text-gray-600">Scroll slowly through your profile - we'll capture it automatically</p>
                                            </div>
                                            <div className="flex gap-3">
                                                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">4</span>
                                                <p className="text-gray-600">Our AI extracts your profile info to personalize your content</p>
                                            </div>
                                        </div>
                                        <p className="mt-6 text-sm text-gray-500">Make sure you have your LinkedIn profile open in another browser window before continuing.</p>
                                    </div>
                                )}

                                {/* Live video preview for previewing/validating/ready states */}
                                {(scrollCaptureMode === 'previewing' || scrollCaptureMode === 'validating' || scrollCaptureMode === 'ready') && videoReady && (
                                    <div className="relative">
                                        <video
                                            ref={(el) => {
                                                if (el && activeStreamRef.current) {
                                                    el.srcObject = activeStreamRef.current;
                                                    el.play().catch(() => {});
                                                    activeVideoRef.current = el;
                                                }
                                            }}
                                            autoPlay
                                            playsInline
                                            muted
                                            className="w-full h-auto border border-gray-200 rounded-lg"
                                        />
                                        {scrollCaptureMode === 'validating' && (
                                            <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg">
                                                <div className="text-center">
                                                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
                                                    <p className="text-sm text-gray-600">Analyzing...</p>
                                                </div>
                                            </div>
                                        )}
                                        {scrollCaptureMode === 'ready' && (
                                            <div className="absolute inset-0 bg-green-500/10 border-4 border-green-500 flex items-center justify-center rounded-lg">
                                                <div className="bg-white px-4 py-2 rounded-lg shadow-lg">
                                                    <p className="text-green-700 font-medium">LinkedIn page confirmed! Click "Start Scrolling" below.</p>
                                                </div>
                                            </div>
                                        )}
                                        {validationResult && !validationResult.isLinkedIn && scrollCaptureMode === 'previewing' && (
                                            <div className="absolute bottom-0 left-0 right-0 bg-amber-50 border-t border-amber-200 px-4 py-3 rounded-b-lg">
                                                <p className="text-amber-800 text-sm font-medium">{validationResult.detectedName}</p>
                                                <p className="text-amber-600 text-xs mt-0.5">Please navigate to your LinkedIn profile and try again.</p>
                                            </div>
                                        )}
                                    </div>
                                )}


                                {(scrollCaptureMode === 'capturing' || scrollCaptureMode === 'done') && capturedFrames.length > 0 && (
                                    <div>
                                        <p className="text-xs text-gray-500 mb-2">First captured section:</p>
                                        <img
                                            src={capturedFrames[0]}
                                            alt="First captured section"
                                            className="w-full h-auto border border-gray-200 rounded-lg"
                                        />
                                    </div>
                                )}

                                {/* Processing state */}
                                {scrollCaptureMode === 'processing' && (
                                    <div className="flex flex-col items-center justify-center h-full min-h-[300px]">
                                        <div className="relative">
                                            <div className="h-16 w-16 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <span className="text-2xl">🤖</span>
                                            </div>
                                        </div>
                                        <p className="mt-6 text-lg font-medium text-gray-900">Analyzing your profile...</p>
                                        <p className="mt-2 text-sm text-gray-500">This usually takes 10-15 seconds</p>
                                        <div className="mt-4 flex gap-1">
                                            <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                            <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                            <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                        </div>
                                    </div>
                                )}

                                {/* Result state */}
                                {scrollCaptureMode === 'result' && profileResult && (
                                    <div className="space-y-6">
                                        {/* Profile header */}
                                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
                                            <h4 className="text-2xl font-bold text-gray-900">{profileResult.full_name}</h4>
                                            <p className="text-lg text-gray-700 mt-1">{profileResult.headline}</p>
                                            <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-600">
                                                {profileResult.location && (
                                                    <span className="flex items-center gap-1">
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        </svg>
                                                        {profileResult.location}
                                                    </span>
                                                )}
                                                {profileResult.industry && (
                                                    <span className="flex items-center gap-1">
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                        </svg>
                                                        {profileResult.industry}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex gap-4 mt-3">
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                                                    {profileResult.connection_count} connections
                                                </span>
                                                {profileResult.follower_count && (
                                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
                                                        {profileResult.follower_count} followers
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* About section */}
                                        {profileResult.about && (
                                            <div className="bg-white border border-gray-200 rounded-lg p-5">
                                                <h5 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">About</h5>
                                                <p className="text-gray-700 whitespace-pre-line">{profileResult.about}</p>
                                            </div>
                                        )}

                                        {/* Recent Activity */}
                                        {profileResult.recent_activity && (
                                            <div className="bg-white border border-gray-200 rounded-lg p-5">
                                                <h5 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">Recent Activity</h5>
                                                {profileResult.recent_activity.activity_summary && (
                                                    <p className="text-gray-600 text-sm mb-4 italic">{profileResult.recent_activity.activity_summary}</p>
                                                )}
                                                {profileResult.recent_activity.posts && profileResult.recent_activity.posts.length > 0 && (
                                                    <div className="space-y-3">
                                                        {profileResult.recent_activity.posts.map((post, index) => (
                                                            <div key={index} className="border-l-2 border-blue-200 pl-3 py-1">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 capitalize">
                                                                        {post.type}
                                                                    </span>
                                                                    {post.date && (
                                                                        <span className="text-xs text-gray-400">{post.date}</span>
                                                                    )}
                                                                </div>
                                                                <p className="text-sm text-gray-700">{post.content}</p>
                                                                {post.engagement && (
                                                                    <p className="text-xs text-gray-500 mt-1">{post.engagement}</p>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Profile Summary */}
                                        {profileResult.profile_summary && (
                                            <div className="bg-white border border-gray-200 rounded-lg p-5">
                                                <h5 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">Profile Summary</h5>
                                                <p className="text-gray-700 whitespace-pre-line leading-relaxed">{profileResult.profile_summary}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Sidebar with captured thumbnails */}
                            {capturedFrames.length > 0 && (scrollCaptureMode === 'capturing' || scrollCaptureMode === 'done') && (
                                <div className="w-48 border-l border-gray-200 p-4 overflow-y-auto bg-gray-50">
                                    <p className="text-xs font-semibold text-gray-600 mb-3">
                                        Captured Sections ({capturedFrames.length})
                                    </p>
                                    <div className="space-y-2">
                                        {capturedFrames.map((frame, index) => (
                                            <div key={index} className="relative">
                                                <img
                                                    src={frame}
                                                    alt={`Section ${index + 1}`}
                                                    className="w-full h-auto border border-gray-300 rounded"
                                                />
                                                <span className="absolute top-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                                                    {index + 1}
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    {scrollCaptureMode === 'capturing' && (
                                        <div className="mt-4 p-2 bg-blue-50 rounded-lg">
                                            <div className="flex items-center gap-2">
                                                <div className="h-2 w-2 bg-blue-600 rounded-full animate-pulse"></div>
                                                <span className="text-xs text-blue-700">Recording...</span>
                                            </div>
                                            {noChangeCount > 0 && (
                                                <p className="text-xs text-blue-600 mt-1">
                                                    {noChangeCount >= 3 ? 'Almost done...' : 'Keep scrolling...'}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {scrollCaptureMode === 'done' && (
                                        <div className="mt-4 p-2 bg-green-50 rounded-lg">
                                            <div className="flex items-center gap-2">
                                                <span className="text-green-600">✓</span>
                                                <span className="text-xs text-green-700">Capture complete!</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
                            {scrollCaptureMode !== 'processing' && scrollCaptureMode !== 'result' && (
                                <button
                                    onClick={cancelScrollCapture}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                            )}

                            {scrollCaptureMode === 'intro' && (
                                <button
                                    onClick={openSharePicker}
                                    className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                                >
                                    Select Window
                                </button>
                            )}

                            {scrollCaptureMode === 'previewing' && (
                                <button
                                    onClick={confirmLinkedInPage}
                                    className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                                >
                                    Yes, this is my LinkedIn profile
                                </button>
                            )}

                            {scrollCaptureMode === 'ready' && (
                                <button
                                    onClick={beginScrollCapture}
                                    className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors"
                                >
                                    Start Scrolling
                                </button>
                            )}

                            {scrollCaptureMode === 'capturing' && (
                                <button
                                    onClick={stopScrollCapture}
                                    className="px-6 py-2 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700 transition-colors"
                                >
                                    Done Scrolling
                                </button>
                            )}

                            {scrollCaptureMode === 'done' && capturedFrames.length > 0 && (
                                <>
                                    <button
                                        onClick={startScrollCapture}
                                        className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                                    >
                                        Recapture
                                    </button>
                                    <button
                                        onClick={uploadScrollCapture}
                                        className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors"
                                    >
                                        Analyze {capturedFrames.length} Section{capturedFrames.length !== 1 ? 's' : ''}
                                    </button>
                                </>
                            )}

                            {scrollCaptureMode === 'result' && (
                                <button
                                    onClick={closeResultModal}
                                    className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors"
                                >
                                    Done
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* LinkedIn Profile View Modal */}
            {showLinkedinProfileView && (
                <div className="fixed top-0 left-0 w-[100vw] h-[100vh] z-[100] flex items-center justify-center bg-black/50 p-4" style={{ margin: 0 }}>
                    <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">LinkedIn Profile</h3>
                                <p className="text-sm text-gray-500 mt-1">Your saved profile information</p>
                            </div>
                            <button
                                onClick={() => setShowLinkedinProfileView(false)}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-auto p-6 space-y-6">
                            {loadingLinkedinProfile ? (
                                <div className="flex flex-col items-center justify-center h-full min-h-[200px]">
                                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                                    <p className="mt-4 text-sm text-gray-600">Loading profile...</p>
                                </div>
                            ) : linkedinProfile ? (
                                <>
                                    {/* Profile header */}
                                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
                                        <h4 className="text-2xl font-bold text-gray-900">{linkedinProfile.full_name}</h4>
                                        <p className="text-lg text-gray-700 mt-1">{linkedinProfile.headline}</p>
                                        <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-600">
                                            {linkedinProfile.location && (
                                                <span className="flex items-center gap-1">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                    {linkedinProfile.location}
                                                </span>
                                            )}
                                            {linkedinProfile.industry && (
                                                <span className="flex items-center gap-1">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                    </svg>
                                                    {linkedinProfile.industry}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex gap-4 mt-3">
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                                                {linkedinProfile.connection_count} connections
                                            </span>
                                            {linkedinProfile.follower_count && (
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
                                                    {linkedinProfile.follower_count} followers
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* About section */}
                                    {linkedinProfile.about && (
                                        <div className="bg-white border border-gray-200 rounded-lg p-5">
                                            <h5 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">About</h5>
                                            <p className="text-gray-700 whitespace-pre-line">{linkedinProfile.about}</p>
                                        </div>
                                    )}

                                    {/* Recent Activity */}
                                    {linkedinProfile.recent_activity && (
                                        <div className="bg-white border border-gray-200 rounded-lg p-5">
                                            <h5 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">Recent Activity</h5>
                                            {linkedinProfile.recent_activity.activity_summary && (
                                                <p className="text-gray-600 text-sm mb-4 italic">{linkedinProfile.recent_activity.activity_summary}</p>
                                            )}
                                            {linkedinProfile.recent_activity.posts && linkedinProfile.recent_activity.posts.length > 0 && (
                                                <div className="space-y-3">
                                                    {linkedinProfile.recent_activity.posts.map((post, index) => (
                                                        <div key={index} className="border-l-2 border-blue-200 pl-3 py-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 capitalize">
                                                                    {post.type}
                                                                </span>
                                                                {post.date && (
                                                                    <span className="text-xs text-gray-400">{post.date}</span>
                                                                )}
                                                            </div>
                                                            <p className="text-sm text-gray-700">{post.content}</p>
                                                            {post.engagement && (
                                                                <p className="text-xs text-gray-500 mt-1">{post.engagement}</p>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Profile Summary */}
                                    {linkedinProfile.profile_summary && (
                                        <div className="bg-white border border-gray-200 rounded-lg p-5">
                                            <h5 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">Profile Summary</h5>
                                            <p className="text-gray-700 whitespace-pre-line leading-relaxed">{linkedinProfile.profile_summary}</p>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-gray-500">
                                    <p>No profile data available</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
                            <button
                                onClick={() => setShowLinkedinProfileView(false)}
                                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
