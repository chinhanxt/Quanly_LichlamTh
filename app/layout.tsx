import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { AuthProvider } from "@/components/AuthProvider";
import { LoginModal } from "@/components/LoginModal";

export const metadata: Metadata = {
  title: "Quản lý Lịch học & Lịch làm việc",
  description: "Quản lý lịch học và nhắc nhở qua Telegram Bot",
  icons: {
    icon: "/avatar.png",
    shortcut: "/avatar.png",
    apple: "/avatar.png",
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-surface-bg text-surface-textPrimary font-sans">
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
          <LoginModal />
        </AuthProvider>
      </body>
    </html>
  );
}
