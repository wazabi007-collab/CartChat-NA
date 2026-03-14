import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { MAX_IMAGE_SIZE, MAX_IMAGE_WIDTH, TARGET_IMAGE_SIZE } from "@/lib/constants";

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
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
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { error: "File is too large" },
        { status: 400 }
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload an image." },
        { status: 400 }
      );
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let processedBuffer: Buffer;

    try {
      // Process with Sharp: resize and convert to WebP
      let quality = 80;
      processedBuffer = await sharp(buffer)
        .rotate() // auto-rotate based on EXIF
        .resize(MAX_IMAGE_WIDTH, undefined, {
          withoutEnlargement: true,
          fit: "inside",
        })
        .webp({ quality })
        .toBuffer();

      // If still over target size, reduce quality iteratively
      while (processedBuffer.length > TARGET_IMAGE_SIZE && quality > 20) {
        quality -= 10;
        processedBuffer = await sharp(buffer)
          .rotate()
          .resize(MAX_IMAGE_WIDTH, undefined, {
            withoutEnlargement: true,
            fit: "inside",
          })
          .webp({ quality })
          .toBuffer();
      }
    } catch {
      // Fallback: try to at least convert to jpeg
      try {
        processedBuffer = await sharp(buffer).rotate().jpeg({ quality: 80 }).toBuffer();
      } catch {
        // Last resort: upload raw buffer
        processedBuffer = buffer;
      }
    }

    // Simple path: userId/timestamp-random.webp
    const timestamp = Date.now();
    const rand = Math.random().toString(36).substring(2, 8);
    const fullPath = `${user.id}/${timestamp}-${rand}.webp`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("merchant-assets")
      .upload(fullPath, processedBuffer, {
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

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("merchant-assets").getPublicUrl(fullPath);

    return NextResponse.json({
      url: publicUrl,
      size: processedBuffer.length,
      path: fullPath,
    });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
