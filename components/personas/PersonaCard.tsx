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
    <Card className="w-[300px] hover:shadow-lg transition-shadow cursor-pointer">
      <CardHeader className="flex flex-row items-center gap-4">
        <Avatar className="h-12 w-12">
          <AvatarImage src={avatarSrc} alt={title} />
          <AvatarFallback>{avatarFallback}</AvatarFallback>
        </Avatar>
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {isHotelReceptionist ? (
          <div className="flex gap-2">
            <Button className="w-1/2" variant="outline" onClick={onDownload} disabled>
              Download JSON
            </Button>
            <Button className="w-1/2" variant="secondary" onClick={onTalk}>
              Talk to Persona
            </Button>
          </div>
        ) : (
          <Button onClick={onClick} className="w-full" variant="secondary">
            Start Chat
          </Button>
        )}
      </CardContent>
    </Card>
  );
} 