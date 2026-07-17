import type { Metadata } from "next";
import "./globals.css";
import { RoleProvider } from "@/components/role-context";
import { Shell } from "@/components/shell";

export const metadata: Metadata = {
  title: "House to House · Antioch Boone",
  description:
    "Stewarding lifegroups and discipleship at Antioch Boone — plant, lead, and multiply house to house community.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <RoleProvider>
          <Shell>{children}</Shell>
        </RoleProvider>
      </body>
    </html>
  );
}
