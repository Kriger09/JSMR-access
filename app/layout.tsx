import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JSMR Access",
  description:
    "Sistema de control de acceso QR para el Fraccionamiento José María Sánchez Ramírez.",
  manifest: "/manifest.json",
  themeColor: "#ea580c",
  icons: {
    apple: "/icon-192.png",
    icon: "/icon-192.png",
  },
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