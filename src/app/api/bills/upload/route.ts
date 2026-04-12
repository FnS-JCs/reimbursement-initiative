import { NextRequest, NextResponse } from "next/server";
import { uploadBillToGoogleDrive, formatFileName } from "@/lib/google-drive";

export async function POST(request: NextRequest) {
  try {
    console.log("📋 Bill upload request received");
    
    // Parse the multipart form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const scName = formData.get("scName") as string;
    const date = formData.get("date") as string;
    const vendorName = formData.get("vendorName") as string;
    const billNumber = formData.get("billNumber") as string;

    console.log("📄 Form data:", { scName, date, vendorName, billNumber, fileName: file?.name, fileSize: file?.size });

    // Validate required fields
    if (!file || !scName || !date || !vendorName || !billNumber) {
      const missing = [];
      if (!file) missing.push("file");
      if (!scName) missing.push("scName");
      if (!date) missing.push("date");
      if (!vendorName) missing.push("vendorName");
      if (!billNumber) missing.push("billNumber");
      
      console.error("❌ Missing fields:", missing);
      return NextResponse.json(
        { error: `Missing required fields: ${missing.join(", ")}` },
        { status: 400 }
      );
    }

    // Get file extension
    const fileExtension = file.name.split(".").pop() || "pdf";

    // Format the filename
    const formattedFileName = formatFileName(scName, date, vendorName, billNumber, fileExtension);
    console.log("📝 Formatted filename:", formattedFileName);

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    console.log("✅ File converted to buffer, size:", buffer.length);

    // Get folder ID from environment
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (!folderId) {
      console.error("❌ GOOGLE_DRIVE_FOLDER_ID environment variable is not set");
      return NextResponse.json(
        { error: "Server configuration error: folder ID not set" },
        { status: 500 }
      );
    }

    console.log("🚀 Uploading to Google Drive folder:", folderId);

    // Upload to Google Drive
    const { fileId, shareableLink } = await uploadBillToGoogleDrive(
      buffer,
      formattedFileName,
      folderId
    );

    console.log("✅ Successfully uploaded to Google Drive:", { fileId, shareableLink });

    return NextResponse.json(
      {
        success: true,
        fileId,
        fileUrl: shareableLink,
        fileName: formattedFileName,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("❌ Bill upload error:", {
      message: error.message,
      stack: error.stack,
      code: error.code,
      status: error.status,
    });
    return NextResponse.json(
      { error: error.message || "Failed to upload bill" },
      { status: 500 }
    );
  }
}
