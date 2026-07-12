"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useState, useRef } from "react";
import { Vehicle, VehicleDocument } from "@prisma/client";
import { ArrowLeft, Upload, Trash2, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from "next/navigation";

export default function VehicleDetailPage({ params }: { params: { id: string } }) {
  const { data: session } = useSession();
  const isManager = session?.user?.role === "FLEET_MANAGER";
  const queryClient = useQueryClient();
  const router = useRouter();

  const [docType, setDocType] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: docs, isLoading } = useQuery<VehicleDocument[]>({
    queryKey: ["vehicle-docs", params.id],
    queryFn: async () => {
      const res = await fetch(`/api/vehicles/${params.id}/documents`);
      if (!res.ok) throw new Error("Failed to fetch documents");
      return res.json();
    }
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file || !docType) throw new Error("Missing file or document type");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("docType", docType);

      const res = await fetch(`/api/vehicles/${params.id}/documents`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-docs", params.id] });
      setFile(null);
      setDocType("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    onError: (err: any) => alert(err.message)
  });

  const deleteMutation = useMutation({
    mutationFn: async (docId: string) => {
      const res = await fetch(`/api/vehicles/${params.id}/documents/${docId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete document");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-docs", params.id] });
    }
  });

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Vehicles
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Vehicle Documents</h1>
        <p className="text-muted-foreground mt-2">
          Manage registration, insurance, and permits.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Upload Form */}
        {isManager && (
          <Card className="md:col-span-1 h-fit shadow-sm">
            <CardHeader>
              <CardTitle>Upload Document</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Document Type</Label>
                <Select value={docType} onValueChange={setDocType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Registration">Registration (RC)</SelectItem>
                    <SelectItem value="Insurance">Insurance</SelectItem>
                    <SelectItem value="Permit">Permit</SelectItem>
                    <SelectItem value="Maintenance Record">Maintenance Record</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>File</Label>
                <Input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </div>
              <Button 
                className="w-full" 
                disabled={!file || !docType || uploadMutation.isPending}
                onClick={() => uploadMutation.mutate()}
              >
                {uploadMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Upload className="mr-2 h-4 w-4" /> Upload
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Document List */}
        <Card className="md:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle>Stored Documents</CardTitle>
            <CardDescription>All uploaded files for this vehicle.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : docs?.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground border-2 border-dashed rounded-lg">
                <FileText className="mx-auto h-8 w-8 mb-2 opacity-50" />
                No documents uploaded yet.
              </div>
            ) : (
              <div className="space-y-3">
                {docs?.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 p-2 rounded text-primary">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-medium">{doc.docType}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(doc.uploadedAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a 
                        href={doc.fileUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-sm font-medium text-blue-600 hover:underline px-3 py-1"
                      >
                        View
                      </a>
                      {isManager && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                          onClick={() => deleteMutation.mutate(doc.id)}
                          disabled={deleteMutation.isPending && deleteMutation.variables === doc.id}
                        >
                          {deleteMutation.isPending && deleteMutation.variables === doc.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
