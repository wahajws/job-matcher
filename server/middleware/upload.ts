import multer from 'multer';
import path from 'path';
import { mkdirSync } from 'fs';
import { existsSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

// Use absolute path for upload directory
const uploadDirRelative = process.env.UPLOAD_DIR || './uploads/cvs';
const uploadDir = path.isAbsolute(uploadDirRelative) 
  ? uploadDirRelative 
  : path.resolve(process.cwd(), uploadDirRelative);
const maxFileSize = parseInt(process.env.MAX_FILE_SIZE || '10485760', 10); // 10MB default

// Ensure upload directory exists synchronously (multer needs sync operations)
if (!existsSync(uploadDir)) {
  try {
    mkdirSync(uploadDir, { recursive: true });
    console.log(`Created upload directory: ${uploadDir}`);
  } catch (error: any) {
    console.error(`Failed to create upload directory: ${error.message}`);
  }
}

// Use diskStorage - multer requires synchronous callbacks
const storage = multer.diskStorage({
  destination: (req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    // Directory already exists, just return it
    cb(null, uploadDir);
  },
  filename: (req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Check MIME type
  const isValidMimeType = file.mimetype === 'application/pdf' || 
                          file.mimetype === 'application/x-pdf' ||
                          file.mimetype === 'application/acrobat' ||
                          file.mimetype === 'text/pdf' ||
                          file.mimetype === 'text/x-pdf';
  
  // Also check file extension as fallback
  const ext = path.extname(file.originalname).toLowerCase();
  const isValidExtension = ext === '.pdf';
  
  if (isValidMimeType || isValidExtension) {
    cb(null, true);
  } else {
    cb(new Error(`Only PDF files are allowed. Received: ${file.mimetype || 'unknown'} (${ext || 'no extension'})`));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: maxFileSize,
    files: 1000, // Allow up to 1000 files per upload
  },
});
