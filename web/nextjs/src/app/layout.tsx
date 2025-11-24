import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Codec Converter",
  description: "Video codec converter application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
