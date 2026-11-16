import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Crônicas de Aether — Sua próxima aventura",
  description: "Um RPG de mesa com Mestre IA. Crie seu herói, explore reinos e escreva uma história só sua.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
