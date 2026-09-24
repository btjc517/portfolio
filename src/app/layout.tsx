import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/react";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { person } from "@/data/cv";
import { PostHogProvider, ThemeProvider } from "./providers";

import "./globals.css";
import React from "react";

const title = `${person.name}, ${person.role} at ${person.company}`;
const description =
  "Ben Cheesebrough builds AI systems that hold up against real data. Founding Technical Lead at ImpactOS, final year of AI and Computer Science at the University of Birmingham, based in London.";

export const metadata: Metadata = {
  metadataBase: new URL(person.site),
  title: {
    default: title,
    template: `%s | ${person.name}`,
  },
  description,
  keywords: [person.name, "ImpactOS", "AI engineer", "Founding engineer", "London", "University of Birmingham", "CV"],
  authors: [{ name: person.name, url: person.site }],
  openGraph: {
    title,
    description,
    url: person.site,
    siteName: person.name,
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: `${person.name}, drawn in characters` }],
    locale: "en_GB",
    type: "profile",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og.jpg"],
  },
  alternates: {
    canonical: person.site,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f4f0" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0c" },
  ],
  colorScheme: "dark light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <head>
        {/* Motion that starts hidden only does so when scripts run, so the page reads without them. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>
        <ThemeProvider>
          <PostHogProvider>
            {children}
            <Analytics />
          </PostHogProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
