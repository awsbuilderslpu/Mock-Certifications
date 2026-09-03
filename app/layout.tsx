import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "AWS LPU Exam Portal",
    template: "%s | AWS LPU",
  },

  description:
    "Exclusive examination and mock test platform for the AWS Student Builder Group at Lovely Professional University.",

  applicationName: "AWS LPU Exam Portal",

  authors: [
    {
      name: "AWS Student Builder Group - LPU",
    },
  ],

  creator: "AWS Student Builder Group - LPU",

  keywords: [
    "AWS",
    "AWS LPU",
    "AWS Student Builder Group",
    "LPU",
    "AWS Certification",
    "AWS Mock Exams",
  ],

  icons: {
    icon: "/aws_sbg.png",
    shortcut: "/aws_sbg.png",
    apple: "/aws_sbg.png",
  },

  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "AWS LPU Exam Portal",
    title: "AWS LPU Exam Portal",
    description:
      "Exclusive examination and mock test platform for the AWS Student Builder Group at LPU.",
    images: [
      {
        url: "/aws_sbg.png",
        alt: "AWS Student Builder Group - LPU",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "AWS LPU Exam Portal",
    description:
      "Exclusive examination and mock test platform for the AWS Student Builder Group at LPU.",
    images: ["/aws_sbg.png"],
  },

  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#111827",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="min-h-screen bg-[#111827] font-sans text-white antialiased">
        <Navbar />
        {children}
      </body>
    </html>
  );
}