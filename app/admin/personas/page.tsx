import { Metadata } from "next";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PlusCircle, Pencil, Trash2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Manage Personas",
  description: "Admin interface for managing chat personas",
};

// This would typically come from your database
const mockPersonas = [
  {
    id: "hotel-receptionist",
    title: "Hotel Receptionist",
    description: "A friendly and professional hotel receptionist ready to assist with your stay",
    avatarFallback: "HR",
    isActive: true,
  },
];

export default function AdminPersonasPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Manage Personas</h1>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add New Persona
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personas List</CardTitle>
          <CardDescription>
            Manage your chat personas. You can add, edit, or remove personas here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Avatar</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockPersonas.map((persona) => (
                <TableRow key={persona.id}>
                  <TableCell>
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      {persona.avatarFallback}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{persona.title}</TableCell>
                  <TableCell>{persona.description}</TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        persona.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {persona.isActive ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
} 