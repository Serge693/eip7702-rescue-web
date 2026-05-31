import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "EIP-7702 Rescue Tool",
  description: "Rescue tokens from a compromised wallet atomically via EIP-7702 delegation",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scanlines noise">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
