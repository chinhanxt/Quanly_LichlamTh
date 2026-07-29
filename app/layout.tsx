import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { AuthProvider } from "@/components/AuthProvider";
import { LoginModal } from "@/components/LoginModal";

export const metadata: Metadata = {
  title: "Thời Khóa Biểu Cá Nhân",
  description: "Quản lý lịch học và nhắc nhở qua Telegram Bot",
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

