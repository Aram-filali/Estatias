"use client";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/Navbar/Navbar";
import Footer from "@/components/Footer/Footer";

export function ConditionalNavbarAndFooter({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const specialPages = ["/admin"];
  const isSpecialPage = pathname.startsWith("/dashboard");
  const isSpecialPages = specialPages.includes(pathname);

  return (
    <>
      {!isSpecialPage && <Navbar />}
      <main className="min-h-screen">{children}</main>
      {!isSpecialPages && !isSpecialPage && <Footer />}
    </>
  );
}
