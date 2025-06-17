"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Zap } from "lucide-react";

interface ModelToggleProps {
  onModelChange: (model: 'gemini' | 'fairness') => void;
  currentModel: 'gemini' | 'fairness';
}

export function ModelToggle({ onModelChange, currentModel }: ModelToggleProps) {
  return (
    <div className="flex flex-col items-center gap-3 p-3 bg-[#23232a] rounded-xl border border-gray-600">
      <span className="text-sm text-gray-300 font-medium">AI Model</span>
      
      <div className="flex gap-2">
        {/* Fairness Model - Recommended */}
        <div className="flex flex-col items-center gap-1">
          <Button
            variant={currentModel === 'fairness' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onModelChange('fairness')}
            className={`text-xs flex items-center gap-1 ${
              currentModel === 'fairness' 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'border-green-600 text-green-400 hover:bg-green-600/10'
            }`}
          >
            <Shield className="w-3 h-3" />
            Fairness Model
            {currentModel === 'fairness' && (
              <Badge variant="secondary" className="ml-1 text-xs bg-green-100 text-green-800">
                Active
              </Badge>
            )}
          </Button>
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="text-xs border-green-500 text-green-400">
              Recommended
            </Badge>
          </div>
          <span className="text-xs text-gray-400 text-center">Respectful & Unbiased</span>
        </div>

        {/* Gemini Model */}
        <div className="flex flex-col items-center gap-1">
          <Button
            variant={currentModel === 'gemini' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onModelChange('gemini')}
            className="text-xs flex items-center gap-1"
          >
            <Zap className="w-3 h-3" />
            Gemini
            {currentModel === 'gemini' && (
              <Badge variant="secondary" className="ml-1 text-xs">
                Active
              </Badge>
            )}
          </Button>
          <div className="h-5"></div> {/* Spacer for alignment */}
          <span className="text-xs text-gray-400 text-center">Fast Responses</span>
        </div>
      </div>
    </div>
  );
} 