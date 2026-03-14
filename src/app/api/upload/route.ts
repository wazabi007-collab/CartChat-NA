import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { MAX_IMAGE_SIZE, MAX_IMAGE_WIDTH, TARGET_IMAGE_SIZE } from "@/lib/constants";

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    // Auth check
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

    // Read and process image
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

    // Upload via raw REST API to bypass any JS client issues
    const timestamp = Date.now();
    const rand = Math.random().toString(36).substring(2, 8);
    const filePath = `${user.id}/${timestamp}-${rand}.webp`;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const uploadRes = await fetch(
      `${supabaseUrl}/storage/v1/object/merchant-assets/${filePath}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "image/webp",
          "Cache-Control": "max-age=31536000",
          "x-upsert": "false",
        },
        body: processedBuffer,
      }
    );

    if (!uploadRes.ok) {
      const errBody = await uploadRes.text();
      console.error("Storage upload error:", uploadRes.status, errBody);
      return NextResponse.json(
        { error: `Upload failed: ${errBody}` },
        { status: 500 }
      );
    }

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/merchant-assets/${filePath}`;

    return NextResponse.json({ url: publicUrl, size: processedBuffer.length });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}
