import type { Metadata, Viewport } from "next";
import "./globals.css";
import { DataProvider } from "@/lib/store";
import { ThemeProvider, THEME_INIT_SCRIPT } from "@/lib/theme";
import { Shell } from "@/components/shell";
import { PwaInstall } from "@/components/pwa-install";

// Static metadata can't know which church is signing in, so it stays neutral -
// the church's own name lives in the signed-in chrome (wordmark, map heading).
export const metadata: Metadata = {
  title: "House to House",
  description:
    "Stewarding groups and discipleship - plant, lead, and multiply house to house community.",
  appleWebApp: { capable: true, title: "House to House", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  // Replaced at runtime by the theme provider; this is the light-theme value.
  themeColor: "#f7f3ea",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        {/* Sets data-theme before first paint so a dark-theme device never
            flashes the cream background. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full">
        <ThemeProvider>
          <DataProvider>
            <Shell>{children}</Shell>
            <PwaInstall />
          </DataProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
