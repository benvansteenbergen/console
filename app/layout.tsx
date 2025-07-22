// apps/console/app/layout.tsx
import '@/globals.css';          // ✅ must come BEFORE the font import
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <body>{children}</body>
    </html>
  );
}

export const metadata = {
    icons: {
        icon:      "/favicon.ico",         // 32×32 + legacy .ico
        shortcut:  "/favicon-16x16.png",      // optional
        apple:     "/apple-icon.png",
    },
};
