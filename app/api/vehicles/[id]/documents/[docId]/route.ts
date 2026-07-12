import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import fs from "fs/promises";
import path from "path";

export async function DELETE(
  req: Request,
  { params }: { params: { id: string, docId: string } }
) {
  try {
    await requireRole(["FLEET_MANAGER"]);
    
    const doc = await prisma.vehicleDocument.findUnique({
      where: { id: params.docId }
    });

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    if (doc.fileUrl.startsWith("/uploads/")) {
      const filePath = path.join(process.cwd(), "public", doc.fileUrl);
      try {
        await fs.unlink(filePath);
      } catch (e) {
        console.error("Failed to delete local file", e);
      }
    }

    await prisma.vehicleDocument.delete({
      where: { id: params.docId }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized" ? 401 : 403 });
    }
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }
}
