import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import sharp from 'sharp';

const ADMIN_SECRET = new TextEncoder().encode(
  process.env.ADMIN_SECRET || 'filtrar_catalogo_admin_secret_key_2026_super_secure_jwt'
);

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qrqqnutkldmtyljtgwxm.supabase.co';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_1MBkgDvheN7CvACrA1vyrg_Ibs1I5Ln';

const BUCKET_NAME = 'productos';

async function ensureBucketExists() {
  // Check if bucket exists via REST API
  const getUrl = `${SUPABASE_URL}/storage/v1/bucket/${BUCKET_NAME}`;
  const getRes = await fetch(getUrl, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });

  if (getRes.status === 404) {
    // Bucket does not exist, create it as public
    const createUrl = `${SUPABASE_URL}/storage/v1/bucket`;
    await fetch(createUrl, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: BUCKET_NAME,
        name: BUCKET_NAME,
        public: true,
        file_size_limit: 10485760, // 10MB
        allowed_mime_types: ['image/webp', 'image/jpeg', 'image/png', 'image/gif'],
      }),
    });
  }
}

export async function POST(req: NextRequest) {
  // Check auth
  const token = req.cookies.get('admin_session')?.value;
  if (!token) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    await jwtVerify(token, ADMIN_SECRET);
  } catch {
    return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const codigo = (formData.get('codigo') as string || 'PRODUCTO').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '_');

    if (!file) {
      return NextResponse.json({ error: 'No se envió ninguna imagen' }, { status: 400 });
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    // Convert & compress image using Sharp to WebP <= 100KB target
    let quality = 82;
    let webpBuffer = await sharp(inputBuffer)
      .resize(1000, 1000, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality, effort: 6 })
      .toBuffer();

    // Reduce quality if larger than 100KB
    while (webpBuffer.length > 100 * 1024 && quality > 30) {
      quality -= 10;
      webpBuffer = await sharp(inputBuffer)
        .resize(1000, 1000, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality, effort: 6 })
        .toBuffer();
    }

    // Ensure Storage Bucket exists
    await ensureBucketExists();

    // Upload to Supabase Storage
    const fileName = `${codigo}_${Date.now()}.webp`;
    const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${BUCKET_NAME}/${fileName}`;

    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'image/webp',
        'x-upsert': 'true',
      },
      body: webpBuffer,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      console.error('Storage upload error:', errText);
      return NextResponse.json({ error: `Error subiendo la imagen: ${errText}` }, { status: 500 });
    }

    // Construct public URL
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${fileName}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      sizeKb: Math.round(webpBuffer.length / 1024),
      fileName,
    });
  } catch (err: any) {
    console.error('Upload handler error:', err);
    return NextResponse.json({ error: err.message || 'Error procesando la imagen' }, { status: 500 });
  }
}
