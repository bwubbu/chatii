"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Globe, Languages } from "lucide-react";

interface LanguageToggleProps {
  onLanguageChange: (language: 'english' | 'malay') => void;
  currentLanguage: 'english' | 'malay';
}

export function LanguageToggle({ onLanguageChange, currentLanguage }: LanguageToggleProps) {
  return (
    <div className="flex flex-col items-center gap-3 p-3 bg-[#23232a] rounded-xl border border-gray-600">
      <span className="text-sm text-gray-300 font-medium flex items-center gap-1">
        <Globe className="w-3 h-3" />
        Language
      </span>
      
      <div className="flex gap-2">
        {/* English */}
        <div className="flex flex-col items-center gap-1">
          <Button
            variant={currentLanguage === 'english' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onLanguageChange('english')}
            className={`text-xs flex items-center gap-1 ${
              currentLanguage === 'english' 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'border-blue-600 text-blue-400 hover:bg-blue-600/10'
            }`}
          >
            <Languages className="w-3 h-3" />
            English
            {currentLanguage === 'english' && (
              <Badge variant="secondary" className="ml-1 text-xs bg-blue-100 text-blue-800">
                Active
              </Badge>
            )}
          </Button>
        </div>

        {/* Malay */}
        <div className="flex flex-col items-center gap-1">
          <Button
            variant={currentLanguage === 'malay' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onLanguageChange('malay')}
            className={`text-xs flex items-center gap-1 ${
              currentLanguage === 'malay' 
                ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                : 'border-purple-600 text-purple-400 hover:bg-purple-600/10'
            }`}
          >
            <Languages className="w-3 h-3" />
            Malay
            {currentLanguage === 'malay' && (
              <Badge variant="secondary" className="ml-1 text-xs bg-purple-100 text-purple-800">
                Active
              </Badge>
            )}
          </Button>
          <span className="text-xs text-gray-400 text-center">Bahasa Malaysia</span>
        </div>
      </div>
    </div>
  );
}


















