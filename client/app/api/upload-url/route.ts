import { NextResponse } from 'next/server';
import AWS from 'aws-sdk';

const s3 = new AWS.S3({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.MY_AWS_ACCESS_KEY!,
    secretAccessKey: process.env.MY_AWS_SECRET_ACCESS_KEY!,
  },
  signatureVersion: 'v4',
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get('fileName');
    const fileType = searchParams.get('fileType');
    if (!fileName || !fileType) {
      return NextResponse.json({ error: 'Missing fileName or fileType' }, { status: 400 });
    }
    const key = `videos/${Date.now()}-${fileName}`;
    const params = {
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: key,
      Expires: 600,
      ContentType: fileType,
    };
    if (process.env.ALLOW_PUBLIC_ACL === 'true') {
      // @ts-ignore 
      params.ACL = 'public-read';
    }
    const uploadUrl = s3.getSignedUrl('putObject', params);
    const publicUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    return NextResponse.json({ 
      uploadUrl, 
      publicUrl,
      key,
    });
  } catch (error) {
    console.error('Error generating pre-signed URL:', error);
    return NextResponse.json({ error: 'Failed to generate upload URL' }, { status: 500 });
  }
} 