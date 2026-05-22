import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JSMR Access",
  description: "Sistema de control de visitantes por QR",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}