"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface PersonaCardProps {
  title: string;
  description: string;
  avatarSrc?: string;
  avatarFallback: string;
  onClick: () => void;
}

export function PersonaCard({
  title,
  description,
  avatarSrc,
  avatarFallback,
  onClick,
  onTalk,
  onDownload,
  id,
}: PersonaCardProps & { onTalk?: () => void; onDownload?: () => void; id?: string }) {
  const isHotelReceptionist = id === "hotel-receptionist";
  return (
    <Card className="w-full bg-[#0F0F0F]/80 backdrop-blur-sm border-gray-600 hover:border-gray-500 transition-all duration-300 hover:shadow-lg hover:shadow-black/50 group">
      <CardHeader className="flex flex-row items-center gap-4">
        <Avatar className="h-12 w-12 border-2 border-gray-600 group-hover:border-gray-500 transition-colors duration-300">
          <AvatarImage src={avatarSrc} alt={title} />
          <AvatarFallback className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 text-white">
            {avatarFallback}
          </AvatarFallback>
        </Avatar>
        <div>
          <CardTitle className="text-white group-hover:text-gray-100 transition-colors duration-300">{title}</CardTitle>
          <CardDescription className="text-gray-400 group-hover:text-gray-300 transition-colors duration-300">
            {description}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {isHotelReceptionist ? (
          <div className="flex gap-2">
            <Button 
              className="w-1/2 bg-[#23272f] text-white hover:bg-[#2C2C2C] border-gray-600 hover:border-gray-500 transition-colors duration-300" 
              variant="outline" 
              onClick={onDownload} 
              disabled
            >
              Download JSON
            </Button>
            <Button 
              className="w-1/2 bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600 transition-all duration-300" 
              variant="secondary" 
              onClick={onTalk}
            >
              Talk to Persona
            </Button>
          </div>
        ) : (
          <Button 
            onClick={onClick} 
            className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600 transition-all duration-300" 
            variant="secondary"
          >
            Start Chat
          </Button>
        )}
      </CardContent>
    </Card>
  );
} 