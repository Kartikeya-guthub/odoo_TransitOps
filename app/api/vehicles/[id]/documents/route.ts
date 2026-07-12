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

    // Since Vercel has a read-only filesystem and Vercel Blob isn't set up,
    // we'll convert the file to a base64 data URI to store directly in the database for the demo.
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64String = buffer.toString('base64');
    const mimeType = file.type || 'application/octet-stream';
    const fileUrl = `data:${mimeType};base64,${base64String}`;

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
