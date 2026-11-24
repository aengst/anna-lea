import crypto from 'crypto';
import sharp from 'sharp';
import { saveFile } from './storage.js';

const LARGE_MAX_WIDTH = 1800;
const THUMB_MAX_WIDTH = 640;

/**
 * Optimerar en uppladdad eller importerad bild med sharp:
 * - Auto-roterar enligt EXIF (viktigt för mobilfoton)
 * - Konverterar till snabb WebP i två storlekar (large + thumb)
 */
export async function processAndSaveImage(input, prefix = 'media', fixedBaseName = null) {
  const safePrefix = prefix.replace(/[^a-z0-9-_]/gi, '').toLowerCase() || 'media';
  const baseName = fixedBaseName
    ? fixedBaseName.replace(/[^a-z0-9-_]/gi, '').toLowerCase()
    : `${safePrefix}-${Date.now()}-${crypto.randomBytes(5).toString('hex')}`;

  // Normalisera orientering en gång
  const normalized = sharp(input).rotate();

  const largePipeline = normalized
    .clone()
    .resize({ width: LARGE_MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: 84 });

  const { data: largeBuf, info: largeInfo } = await largePipeline.toBuffer({
    resolveWithObject: true,
  });

  const thumbBuf = await normalized
    .clone()
    .resize({ width: THUMB_MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  const urlLarge = await saveFile(`${baseName}-lg.webp`, largeBuf);
  const urlThumb = await saveFile(`${baseName}-sm.webp`, thumbBuf);

  return {
    urlLarge,
    urlThumb,
    width: largeInfo.width || null,
    height: largeInfo.height || null,
  };
}
