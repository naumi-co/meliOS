import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MeliOS",
  description: "Margin visibility for MercadoLibre sellers",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
