"use client";

import { usePathname } from "next/navigation";
import Footer from "./Footer";

export default function ConditionalFooter() {
  const pathname = usePathname();
  
  // Hide footer on chat pages
  const isChatPage = pathname?.startsWith("/chat/");
  
  if (isChatPage) {
    return null;
  }
  
  return <Footer />;
}
