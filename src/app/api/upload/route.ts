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
    const storagePath = formData.get("path") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { error: "File exceeds 20MB limit" },
        { status: 400 }
      );
    }

    // Validate file type (HEIC/HEIF are iPhone native formats)
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"];
    if (!allowedTypes.includes(file.type) && !file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload an image." },
        { status: 400 }
      );
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let processedBuffer: Buffer;
    let outputExt = "webp";
    let outputContentType = "image/webp";

    try {
      // Process with Sharp: resize and convert to WebP
      let quality = 80;
      processedBuffer = await sharp(buffer)
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
          .resize(MAX_IMAGE_WIDTH, undefined, {
            withoutEnlargement: true,
            fit: "inside",
          })
          .webp({ quality })
          .toBuffer();
      }
    } catch (sharpError) {
      // Fallback: upload original image if sharp fails
      console.error("Sharp processing failed, uploading original:", sharpError);
      processedBuffer = buffer;
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      outputExt = ext;
      outputContentType = file.type || "image/jpeg";
    }

    // Generate unique filename — sanitize extension to safe characters only
    const safeExt = outputExt.replace(/[^a-z0-9]/gi, "").toLowerCase() || "webp";
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const fileName = `${timestamp}-${randomSuffix}.${safeExt}`;
    // Sanitize path — only allow alphanumeric, hyphens, slashes, underscores
    const rawPath = storagePath
      ? `${storagePath}/${fileName}`
      : `${user.id}/${fileName}`;
    const fullPath = rawPath.replace(/[^a-zA-Z0-9\-_\/\.]/g, "_");

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("merchant-assets")
      .upload(fullPath, processedBuffer, {
        contentType: outputContentType,
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
