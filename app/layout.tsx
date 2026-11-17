import type { Metadata } from "next";
import "./globals.css";
import { Header, Footer } from "@/components/header";
export const metadata: Metadata = {
  title: {
    default: "DotaScope — Каждая игра имеет значение",
    template: "%s · DotaScope",
  },
  description:
    "Твой Dota 2 матч под микроскопом: реальный импакт, тайминги предметов и персональный AI-тренер.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" data-scroll-behavior="smooth">
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
