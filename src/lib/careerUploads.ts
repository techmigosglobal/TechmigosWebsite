import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_UPLOAD_DIR = path.join(process.cwd(), 'data', 'uploads', 'careers');

export const CAREER_UPLOAD_DIR = process.env.CAREER_UPLOAD_DIR ?? DEFAULT_UPLOAD_DIR;
export const MAX_RESUME_SIZE = 5 * 1024 * 1024;
export const ALLOWED_RESUME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
export const ALLOWED_RESUME_EXTENSIONS = new Set(['pdf', 'doc', 'docx']);

function sanitizeBaseName(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

export function getFileExtension(fileName: string) {
  const parts = fileName.split('.');
  return parts.length > 1 ? parts.pop()?.toLowerCase() ?? '' : '';
}

export function validateResumeFile(file: File) {
  const extension = getFileExtension(file.name);
  const mimeAccepted = file.type ? ALLOWED_RESUME_TYPES.has(file.type) : false;
  const extensionAccepted = ALLOWED_RESUME_EXTENSIONS.has(extension);

  if (!mimeAccepted && !extensionAccepted) {
    return 'Upload a PDF, DOC, or DOCX file.';
  }

  if (file.size > MAX_RESUME_SIZE) {
    return 'Resume files must be 5 MB or smaller.';
  }

  return '';
}

export async function saveCareerResume(file: File, applicantName: string) {
  await fs.mkdir(CAREER_UPLOAD_DIR, { recursive: true });

  const extension = getFileExtension(file.name) || 'bin';
  const safeName = sanitizeBaseName(applicantName || 'candidate') || 'candidate';
  const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const storedFileName = `${safeName}-${uniqueSuffix}.${extension}`;
  const absolutePath = path.join(CAREER_UPLOAD_DIR, storedFileName);
  const buffer = Buffer.from(await file.arrayBuffer());

  await fs.writeFile(absolutePath, buffer);

  return {
    originalName: file.name,
    storedFileName,
    mimeType: file.type || 'application/octet-stream',
    size: file.size,
    absolutePath,
    relativePath: path.relative(process.cwd(), absolutePath),
  };
}
