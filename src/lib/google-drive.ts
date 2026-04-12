import { google } from "googleapis";
import { Readable } from "stream";

// Get OAuth access token using refresh token
const getAccessToken = async (): Promise<string> => {
  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Missing Google Drive OAuth credentials. Please run /auth/google-drive-authorize to get a refresh token."
    );
  }

  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }).toString(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to refresh access token: ${error.error_description}`);
    }

    const data = await response.json();
    return data.access_token;
  } catch (error: any) {
    console.error("Failed to get access token:", error.message);
    throw error;
  }
};

// Initialize Google Drive API client with OAuth
const getGoogleDriveClient = async () => {
  const accessToken = await getAccessToken();

  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_DRIVE_CLIENT_ID!,
    process.env.GOOGLE_DRIVE_CLIENT_SECRET!
  );

  auth.setCredentials({
    access_token: accessToken,
  });

  return google.drive({ version: "v3", auth });
};

// Format filename: SC Name || Date || Vendor || Bill Number
export const formatFileName = (
  scName: string,
  date: string,
  vendorName: string,
  billNumber: string,
  fileExtension: string
): string => {
  return `${scName} || ${date} || ${vendorName} || ${billNumber}.${fileExtension}`;
};

// Upload file to Google Drive and return shareable link
export const uploadBillToGoogleDrive = async (
  fileBuffer: Buffer,
  fileName: string,
  folderId: string
): Promise<{ fileId: string; shareableLink: string }> => {
  const drive = await getGoogleDriveClient();

  try {
    console.log("🔄 Creating readable stream from buffer");

    // Create a proper readable stream from the buffer
    const readable = Readable.from([fileBuffer]);

    console.log(`📤 Uploading file to Google Drive folder: ${folderId}`);
    console.log(`📝 File name: ${fileName}`);
    console.log(`📊 File size: ${fileBuffer.length} bytes`);

    // First, verify we can access the parent folder
    try {
      const folderCheck = await drive.files.get({
        fileId: folderId,
        fields: "id,name,webViewLink",
      });
      console.log(`✅ Verified folder access: ${folderCheck.data.name}`);
    } catch (folderError: any) {
      console.error(`❌ Cannot access parent folder:`, folderError.message);
      throw folderError;
    }

    // Upload file to the specified folder
    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId],
      },
      media: {
        mimeType: "application/octet-stream",
        body: readable,
      },
      fields: "id,webViewLink",
    });

    const fileId = response.data.id;
    if (!fileId) {
      throw new Error("File ID not returned from Google Drive");
    }

    console.log("✅ File uploaded successfully, fileId:", fileId);

    // Set file permissions to allow anyone with the link to access (editor access)
    console.log("🔐 Setting file permissions to 'anyone with link - editor'");

    try {
      await drive.permissions.create({
        fileId,
        requestBody: {
          role: "writer", // editor access
          type: "anyone",
        },
        fields: "id",
      });
      console.log("✅ Permissions set successfully");
    } catch (permError: any) {
      console.error("⚠️  Permission error (non-critical):", permError.message);
      // Don't throw - file is already uploaded
    }

    // Generate shareable link
    const shareableLink = `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;

    return { fileId, shareableLink };
  } catch (error: any) {
    console.error("❌ Google Drive upload error details:", {
      message: error.message,
      code: error.code,
      status: error.status,
      statusText: error.statusText,
    });
    throw new Error(`Failed to upload file to Google Drive: ${error.message}`);
  }
};

// Verify folder access (utility function)
export const verifyFolderAccess = async (folderId: string): Promise<boolean> => {
  const drive = await getGoogleDriveClient();

  try {
    await drive.files.get({
      fileId: folderId,
      fields: "id",
    });
    return true;
  } catch (error: any) {
    console.error(`Failed to access folder ${folderId}:`, error.message);
    return false;
  }
};
