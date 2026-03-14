import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { MAX_IMAGE_SIZE, MAX_IMAGE_WIDTH, TARGET_IMAGE_SIZE } from "@/lib/constants";

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    // Auth check with regular client
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: "File is too large" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Please upload an image file" }, { status: 400 });
    }

    // Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    let processedBuffer: Buffer;
    try {
      let quality = 80;
      processedBuffer = await sharp(buffer)
        .rotate()
        .resize(MAX_IMAGE_WIDTH, undefined, { withoutEnlargement: true, fit: "inside" })
        .webp({ quality })
        .toBuffer();

      while (processedBuffer.length > TARGET_IMAGE_SIZE && quality > 20) {
        quality -= 10;
        processedBuffer = await sharp(buffer)
          .rotate()
          .resize(MAX_IMAGE_WIDTH, undefined, { withoutEnlargement: true, fit: "inside" })
          .webp({ quality })
          .toBuffer();
      }
    } catch {
      try {
        processedBuffer = await sharp(buffer).rotate().jpeg({ quality: 80 }).toBuffer();
      } catch {
        processedBuffer = buffer;
      }
    }

    // Upload via service client (bypasses RLS)
    const service = createServiceClient();
    const timestamp = Date.now();
    const rand = Math.random().toString(36).substring(2, 8);
    const fullPath = `${user.id}/${timestamp}-${rand}.webp`;

    // Convert to Uint8Array — Supabase JS v2 validates Buffer type strictly
    const uploadBody = new Uint8Array(processedBuffer);

    const { error: uploadError } = await service.storage
      .from("merchant-assets")
      .upload(fullPath, uploadBody, {
        contentType: "image/webp",
        cacheControl: "31536000",
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const {
      data: { publicUrl },
    } = service.storage.from("merchant-assets").getPublicUrl(fullPath);

    return NextResponse.json({ url: publicUrl, size: processedBuffer.length });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}
