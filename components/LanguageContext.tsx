"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { type Language } from "@/lib/malay-language-helper";

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Always start with "english" to ensure server and client match
  const [language, setLanguageState] = useState<Language>("english");
  const [mounted, setMounted] = useState(false);

  // Load from localStorage only after component mounts (client-side only)
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("ramahai-language");
    if (saved === "english" || saved === "malay") {
      setLanguageState(saved);
    }
  }, []);

  // Save to localStorage whenever language changes (but only after mount)
  useEffect(() => {
    if (mounted) {
      localStorage.setItem("ramahai-language", language);
    }
  }, [language, mounted]);

  const setLanguage = (newLanguage: Language) => {
    setLanguageState(newLanguage);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}














