import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { parse } from 'path';
import { CreativeType } from '@prisma/client';

// Configure the runtime for the route handler
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Configure S3 client
const s3 = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

// File type validations
const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/avi', 'video/quicktime'];
const allowedInteractiveTypes = [
  'text/html', 'application/javascript', 'application/zip',
  'application/octet-stream', // For binary files like AR/VR assets
  'application/x-gltf+json', 'model/gltf+json', 'model/gltf-binary', // For 3D models
  'audio/mpeg', 'audio/wav', // For voice interactive
];

// Max file size in bytes (20MB)
const MAX_FILE_SIZE = 20 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'ADVERTISER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse the multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const type = formData.get('type') as string; // 'content' or 'preview'
    const contentType = formData.get('contentType') as CreativeType | undefined;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size exceeds the limit (20MB)' }, { status: 400 });
    }

    // Validate file type
    let validFileType = false;
    if (type === 'preview' && allowedImageTypes.includes(file.type)) {
      validFileType = true;
    } else if (type === 'content') {
      if (contentType === 'IMAGE' && allowedImageTypes.includes(file.type)) {
        validFileType = true;
      } else if (contentType === 'VIDEO' && allowedVideoTypes.includes(file.type)) {
        validFileType = true;
      } else if (['INTERACTIVE', 'AR_EXPERIENCE', 'VOICE_INTERACTIVE'].includes(contentType || '') && 
        (allowedInteractiveTypes.includes(file.type) || allowedImageTypes.includes(file.type) || allowedVideoTypes.includes(file.type))) {
        // More permissive for interactive types
        validFileType = true;
      }
    }

    if (!validFileType) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    // Read the file into a buffer
    const fileBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(fileBuffer);

    // Generate a unique filename with original extension
    const fileName = `${uuidv4()}${getFileExtension(file.name)}`;
    
    // Determine folder path based on type and content type
    let folderPath = 'creatives/';
    if (type === 'preview') {
      folderPath += 'previews/';
    } else if (contentType) {
      folderPath += contentType.toLowerCase() + '/';
    }

    // Upload to S3
    const s3Key = `${folderPath}${fileName}`;
    const uploadParams = {
      Bucket: process.env.AWS_BUCKET_NAME || 'lumen-adtech-media',
      Key: s3Key,
      Body: buffer,
      ContentType: file.type,
      ACL: 'public-read', // Make the file publicly accessible
    };

    await s3.send(new PutObjectCommand(uploadParams));

    // Construct the public URL
    const fileUrl = `https://${uploadParams.Bucket}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${s3Key}`;

    return NextResponse.json({ url: fileUrl });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'An error occurred during file upload' }, 
      { status: 500 }
    );
  }
}

// Get file extension from filename
function getFileExtension(filename: string): string {
  const parsedPath = parse(filename);
  return parsedPath.ext;
}