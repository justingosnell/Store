import crypto from "crypto";

function getCloudinaryUrlConfig() {
  const cloudinaryUrl = process.env.CLOUDINARY_URL;
  if (!cloudinaryUrl) return {};

  try {
    const url = new URL(cloudinaryUrl);
    return {
      cloudName: url.hostname,
      apiKey: decodeURIComponent(url.username),
      apiSecret: decodeURIComponent(url.password),
    };
  } catch {
    console.warn("CLOUDINARY_URL is set but could not be parsed.");
    return {};
  }
}

const cloudinaryUrlConfig = getCloudinaryUrlConfig();
const cloudinaryCloudName = process.env.CLOUDINARY_CLOUD_NAME || cloudinaryUrlConfig.cloudName;
const cloudinaryApiKey = process.env.CLOUDINARY_API_KEY || cloudinaryUrlConfig.apiKey;
const cloudinaryApiSecret = process.env.CLOUDINARY_API_SECRET || cloudinaryUrlConfig.apiSecret;
const cloudinaryFolder = process.env.CLOUDINARY_FOLDER || "tiny-treasures/products";

export const isCloudinaryConfigured = Boolean(cloudinaryCloudName && cloudinaryApiKey && cloudinaryApiSecret);

console.log("Cloudinary initialization:", {
  cloudName: cloudinaryCloudName || "MISSING",
  apiKey: cloudinaryApiKey ? "SET" : "MISSING",
  apiSecret: cloudinaryApiSecret ? "SET" : "MISSING",
  folder: cloudinaryFolder,
});

function getCloudinaryUploadUrl() {
  if (!cloudinaryCloudName) {
    throw new Error("Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.");
  }

  return `https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/image/upload`;
}

function getCloudinaryAdminUrl(path: string) {
  if (!cloudinaryCloudName) {
    throw new Error("Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.");
  }

  return `https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/${path}`;
}

function getCloudinaryAuthHeader() {
  if (!cloudinaryApiKey || !cloudinaryApiSecret) {
    throw new Error("Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.");
  }

  return `Basic ${Buffer.from(`${cloudinaryApiKey}:${cloudinaryApiSecret}`).toString("base64")}`;
}

function getSignature(params: Record<string, string | number>) {
  if (!cloudinaryApiSecret) {
    throw new Error("Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.");
  }

  const payload = Object.entries(params)
    .filter(([, value]) => value !== "" && value !== undefined && value !== null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return crypto.createHash("sha1").update(`${payload}${cloudinaryApiSecret}`).digest("hex");
}

export type CloudinaryFile = {
  publicId: string;
  filename: string;
  url: string;
  secureUrl: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  createdAt?: string;
};

type CloudinaryUploadResponse = {
  public_id: string;
  original_filename?: string;
  secure_url: string;
  url: string;
  resource_type: string;
  format?: string;
  bytes: number;
  width?: number;
  height?: number;
  created_at?: string;
  error?: { message?: string };
};

type CloudinaryResource = {
  public_id: string;
  filename?: string;
  secure_url: string;
  url: string;
  resource_type: string;
  format?: string;
  bytes: number;
  width?: number;
  height?: number;
  created_at?: string;
};

function normalizeCloudinaryFile(file: CloudinaryUploadResponse | CloudinaryResource): CloudinaryFile {
  const originalFilename = "original_filename" in file ? file.original_filename : undefined;
  const resourceFilename = "filename" in file ? file.filename : undefined;

  return {
    publicId: file.public_id,
    filename: originalFilename || resourceFilename || file.public_id.split("/").pop() || file.public_id,
    url: file.secure_url || file.url,
    secureUrl: file.secure_url || file.url,
    mimeType: file.format ? `image/${file.format}` : "image/jpeg",
    size: file.bytes || 0,
    width: file.width,
    height: file.height,
    createdAt: file.created_at,
  };
}

export async function uploadFileToCloudinary(fileBuffer: Buffer, fileName: string, contentType: string): Promise<CloudinaryFile> {
  if (!isCloudinaryConfigured || !cloudinaryApiKey) {
    throw new Error("Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.");
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const uploadParams = {
    folder: cloudinaryFolder,
    timestamp,
    use_filename: "true",
    unique_filename: "true",
  };
  const signature = getSignature(uploadParams);
  const formData = new FormData();
  formData.append("file", new Blob([new Uint8Array(fileBuffer)], { type: contentType }), fileName);
  formData.append("api_key", cloudinaryApiKey);
  formData.append("folder", cloudinaryFolder);
  formData.append("timestamp", String(timestamp));
  formData.append("use_filename", "true");
  formData.append("unique_filename", "true");
  formData.append("signature", signature);

  const response = await fetch(getCloudinaryUploadUrl(), {
    method: "POST",
    body: formData,
  });

  const data = (await response.json()) as CloudinaryUploadResponse;
  if (!response.ok) {
    throw new Error(`Cloudinary upload failed: ${data.error?.message || response.statusText}`);
  }

  return normalizeCloudinaryFile(data);
}

export async function listCloudinaryImages(): Promise<CloudinaryFile[]> {
  if (!isCloudinaryConfigured) return [];

  const url = new URL(getCloudinaryAdminUrl(`resources/image/upload`));
  url.searchParams.set("prefix", `${cloudinaryFolder}/`);
  url.searchParams.set("max_results", "100");

  const response = await fetch(url, {
    headers: {
      Authorization: getCloudinaryAuthHeader(),
    },
  });

  const data = (await response.json()) as { resources?: CloudinaryResource[]; error?: { message?: string } };
  if (!response.ok) {
    throw new Error(`Cloudinary list failed: ${data.error?.message || response.statusText}`);
  }

  return (data.resources || []).map(normalizeCloudinaryFile);
}

export async function deleteCloudinaryFile(publicId: string): Promise<void> {
  if (!isCloudinaryConfigured || !publicId) return;

  const response = await fetch(getCloudinaryAdminUrl(`resources/image/upload/${encodeURIComponent(publicId)}`), {
    method: "DELETE",
    headers: {
      Authorization: getCloudinaryAuthHeader(),
    },
  });

  if (!response.ok && response.status !== 404) {
    const data = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(`Cloudinary delete failed: ${data.error?.message || response.statusText}`);
  }
}
