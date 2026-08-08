import { google, drive_v3 } from "googleapis";
import { Readable } from "stream";

const GOOGLE_DRIVE_REAUTH_MESSAGE =
  "Google Drive authorization has expired or was revoked. Re-authorize at /api/auth/google-drive-authorize, then update GOOGLE_DRIVE_REFRESH_TOKEN in your deployed environment (Vercel env vars in production, .env.local locally) and redeploy or restart.";

const FALLBACK_FOLDER_NAME = "Reimbursement Bills";

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
      if (error?.error === "invalid_grant") {
        throw new Error(GOOGLE_DRIVE_REAUTH_MESSAGE);
      }

      throw new Error(
        error?.error_description
          ? `Failed to refresh access token: ${error.error_description}`
          : "Failed to refresh access token."
      );
    }

    const data = await response.json();
    return data.access_token;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Failed to get access token:", msg);
    throw new Error(msg);
  }
};

// Initialize Google Drive API client with OAuth
const getGoogleDriveClient = async (): Promise<drive_v3.Drive> => {
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
const ensureDriveFolder = async (drive: drive_v3.Drive, folderId: string): Promise<string> => {
  try {
    const folderCheck = await drive.files.get({
      fileId: folderId,
      fields: "id,name",
    });

    console.log(`✅ Verified folder access: ${folderCheck.data.name || folderId}`);
    return folderId;
  } catch (folderError: unknown) {
    const folderMsg = folderError instanceof Error ? folderError.message : String(folderError);
    console.warn(`⚠️ Folder ${folderId} is not accessible (${folderMsg || "unknown error"}). Attempting to create a fallback folder.`);

    try {
      const createdFolder = await drive.files.create({
        requestBody: {
          name: FALLBACK_FOLDER_NAME,
          mimeType: "application/vnd.google-apps.folder",
        },
        fields: "id,name",
      });

      const createdFolderId = createdFolder.data.id;
      if (!createdFolderId) {
        throw new Error("Google Drive did not return a folder ID for the fallback folder.");
      }

      process.env.GOOGLE_DRIVE_FOLDER_ID = createdFolderId;
      console.log(`✅ Created fallback Google Drive folder: ${createdFolder.data.name || FALLBACK_FOLDER_NAME}`);
      return createdFolderId;
    } catch (createError: unknown) {
      const createMsg = createError instanceof Error ? createError.message : String(createError);
      console.error("❌ Unable to create a fallback Google Drive folder:", createMsg);
      throw new Error(createMsg);
    }
  }
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

    const resolvedFolderId = await ensureDriveFolder(drive, folderId);

    // Upload file to the specified folder
    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [resolvedFolderId],
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
    } catch (permError: unknown) {
      const permMsg = permError instanceof Error ? permError.message : String(permError);
      console.error("⚠️  Permission error (non-critical):", permMsg);
      // Don't throw - file is already uploaded
    }

    // Generate shareable link
    const shareableLink = `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;

    return { fileId, shareableLink };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("❌ Google Drive upload error details:", errMsg);
    throw new Error(`Failed to upload file to Google Drive: ${errMsg}`);
  }
};

export const extractGoogleDriveFileId = (fileUrl: string): string | null => {
  const directMatch = fileUrl.match(/\/file\/d\/([^/]+)/);
  if (directMatch?.[1]) {
    return directMatch[1];
  }

  try {
    const url = new URL(fileUrl);
    return url.searchParams.get("id");
  } catch {
    return null;
  }
};

export const deleteBillFromGoogleDrive = async (fileId: string): Promise<void> => {
  const drive = await getGoogleDriveClient();

  try {
    await drive.files.delete({
      fileId,
    });
  } catch (error: unknown) {
    const e = error instanceof Error ? error : new Error(String(error));
    // If it's a 404 from Drive client, swallow
    // Try to read a 'code' property if present
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const code = (error as any)?.code;
    if (code === 404) return;

    console.error("Failed to delete Google Drive file:", {
      fileId,
      message: e.message,
      code,
    });
    throw new Error(`Failed to delete file from Google Drive: ${e.message || "Unknown error"}`);
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
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`Failed to access folder ${folderId}:`, msg);
    return false;
  }
};
