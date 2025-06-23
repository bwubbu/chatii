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
              {/* Remove mockPersonas array */}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
} 