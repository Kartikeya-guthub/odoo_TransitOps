import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import fs from "fs/promises";
import path from "path";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireRole(["FLEET_MANAGER"]);
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const docType = formData.get("docType") as string;

    if (!file || !docType) {
      return NextResponse.json({ error: "File and document type required" }, { status: 400 });
    }

    // Since Vercel Blob isn't set up, mock storage locally for demo
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadDir = path.join(process.cwd(), "public", "uploads", params.id);
    await fs.mkdir(uploadDir, { recursive: true });
    
    const fileName = `${Date.now()}-${file.name}`;
    const filePath = path.join(uploadDir, fileName);
    await fs.writeFile(filePath, buffer);

    const fileUrl = `/uploads/${params.id}/${fileName}`;

    const doc = await prisma.vehicleDocument.create({
      data: {
        vehicleId: params.id,
        docType,
        fileUrl,
      },
    });

    return NextResponse.json(doc);
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized" ? 401 : 403 });
    }
    return NextResponse.json({ error: "Failed to upload document" }, { status: 500 });
  }
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const docs = await prisma.vehicleDocument.findMany({
      where: { vehicleId: params.id },
      orderBy: { uploadedAt: "desc" },
    });
    return NextResponse.json(docs);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }
}
