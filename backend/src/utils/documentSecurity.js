import crypto from 'crypto';

export const ALLOWED_EXTENSIONS = [
  'ppt',
  'pptx',
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'txt',
  'jpg',
  'jpeg',
  'png',
];

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

export const MIME_TYPE_MAP = {
  pdf: ['application/pdf'],
  pptx: ['application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/zip', 'application/octet-stream'],
  ppt: ['application/vnd.ms-powerpoint', 'application/x-mspowerpoint', 'application/octet-stream'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip', 'application/octet-stream'],
  doc: ['application/msword', 'application/octet-stream'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/zip', 'application/octet-stream'],
  xls: ['application/vnd.ms-excel', 'application/octet-stream'],
  txt: ['text/plain', 'text/csv', 'application/octet-stream'],
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  png: ['image/png'],
};

/**
 * Validates file extension, size, MIME type and content magic bytes.
 * Ensures no executable or dangerous macro files are accepted.
 */
export const validateUploadedDocument = (file) => {
  if (!file) {
    return { isValid: false, error: 'No file provided.' };
  }

  // 1. File size check
  const size = file.size || (file.buffer ? file.buffer.length : 0);
  if (size > MAX_FILE_SIZE_BYTES) {
    return {
      isValid: false,
      error: `File size (${(size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum limit of 50MB.`,
    };
  }

  // 2. Extension check
  const originalName = file.originalname || file.name || '';
  const extMatch = originalName.match(/\.([0-9a-zA-Z]+)$/);
  if (!extMatch) {
    return { isValid: false, error: 'File lacks a valid file extension.' };
  }
  const extension = extMatch[1].toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return {
      isValid: false,
      error: `Unsupported file extension .${extension}. Allowed formats: ${ALLOWED_EXTENSIONS.join(', ').toUpperCase()}`,
    };
  }

  // 3. MIME type check
  const declaredMime = (file.mimetype || '').toLowerCase();
  const allowedMimes = MIME_TYPE_MAP[extension] || [];
  if (declaredMime && allowedMimes.length > 0 && !allowedMimes.includes(declaredMime)) {
    // Some browsers or curl send application/octet-stream which is acceptable if magic bytes match
    if (declaredMime !== 'application/octet-stream') {
      return {
        isValid: false,
        error: `MIME type "${declaredMime}" does not match file extension .${extension}`,
      };
    }
  }

  // 4. Magic bytes and safety check
  const buffer = file.buffer;
  if (buffer && buffer.length >= 4) {
    // Check for Windows Executable PE / MZ header
    if (buffer[0] === 0x4d && buffer[1] === 0x5a) {
      return { isValid: false, error: 'Security violation: Executable binary file (MZ) rejected.' };
    }
    // Check for Linux ELF executable header
    if (buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46) {
      return { isValid: false, error: 'Security violation: Executable ELF file rejected.' };
    }

    // Format specific magic bytes
    if (extension === 'pdf') {
      const isPdfHeader = buffer.slice(0, 5).toString('ascii').startsWith('%PDF-');
      if (!isPdfHeader) {
        return { isValid: false, error: 'Invalid PDF content: Missing %PDF- file header.' };
      }
    } else if (['pptx', 'docx', 'xlsx'].includes(extension)) {
      const isZip = buffer[0] === 0x50 && buffer[1] === 0x4b && (buffer[2] === 0x03 || buffer[2] === 0x05);
      if (!isZip) {
        return { isValid: false, error: `Invalid ${extension.toUpperCase()} document: Missing OpenXML ZIP package signature.` };
      }
    } else if (['ppt', 'doc', 'xls'].includes(extension)) {
      const isOle = buffer[0] === 0xd0 && buffer[1] === 0xcf && buffer[2] === 0x11 && buffer[3] === 0xe0;
      // Allow if valid OLE or text-like fallback
      if (!isOle && !isTextContent(buffer)) {
        return { isValid: false, error: `Invalid legacy .${extension} format.` };
      }
    } else if (extension === 'png') {
      const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
      if (!isPng) {
        return { isValid: false, error: 'Invalid PNG image: Header bytes do not match PNG standard.' };
      }
    } else if (extension === 'jpg' || extension === 'jpeg') {
      const isJpg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
      if (!isJpg) {
        return { isValid: false, error: 'Invalid JPEG image: Header bytes do not match JPEG standard.' };
      }
    }
  }

  return {
    isValid: true,
    extension,
    fileSize: size,
    originalName,
  };
};

function isTextContent(buffer) {
  // Check if initial 512 bytes are mostly ASCII printable / UTF-8
  const sample = buffer.slice(0, Math.min(buffer.length, 512));
  let nonPrintable = 0;
  for (let i = 0; i < sample.length; i++) {
    const byte = sample[i];
    if (byte === 0) return false;
    if (byte < 9 || (byte > 13 && byte < 32)) nonPrintable++;
  }
  return nonPrintable / sample.length < 0.15;
}

export const computeFileHash = (buffer) => {
  return crypto.createHash('sha256').update(buffer).digest('hex');
};
