import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Inkapslad lagringstjänst för uppladdad media.
 * Idag sparas filer lokalt i UPLOAD_PATH (monterad Docker-volym på ZBook).
 * Vid framtida molnflytt kan denna enda fil bytas mot t.ex. S3 eller Cloudflare R2.
 */
export function getUploadDir() {
  const configured = process.env.UPLOAD_PATH;
  if (configured) {
    return path.isAbsolute(configured)
      ? configured
      : path.resolve(__dirname, '../../', configured);
  }
  return path.resolve(__dirname, '../../uploads');
}

export async function ensureUploadDir() {
  const dir = getUploadDir();
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export async function saveFile(filename, buffer) {
  const dir = await ensureUploadDir();
  const safeName = path.basename(filename);
  const fullPath = path.join(dir, safeName);
  await fs.writeFile(fullPath, buffer);
  return `/uploads/${safeName}`;
}

export async function deleteFileByUrl(publicUrl) {
  if (!publicUrl || !publicUrl.startsWith('/uploads/')) return;
  const safeName = path.basename(publicUrl);
  const fullPath = path.join(getUploadDir(), safeName);
  try {
    await fs.unlink(fullPath);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn(`Kunde inte ta bort fil ${fullPath}:`, err.message);
    }
  }
}
