import { Router } from 'express';
import { candidateController } from '../controllers/candidateController.js';
import { upload } from '../middleware/upload.js';
import { existsSync, statSync } from 'fs';

const router = Router();

router.get('/', (req, res) => candidateController.list(req, res));
router.get('/:id', (req, res) => candidateController.get(req, res));
router.put('/:id', (req, res) => candidateController.update(req, res));
router.delete('/:id', (req, res) => candidateController.delete(req, res));
// Upload route - multer must process BEFORE any body parsing
router.post('/upload', (req, res, next) => {
  console.log('Upload route - before multer');
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Content-Length:', req.headers['content-length']);
  
  upload.any()(req, res, (err: any) => {
    if (err) {
      console.error('Multer error:', err);
      return res.status(400).json({ message: err.message || 'File upload failed' });
    }
    
    // Extract files from req.files (which is an array when using .any())
    const allFiles = (req.files as Express.Multer.File[]) || [];
    const files = allFiles.filter(f => f.fieldname === 'files');
    
    if (files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }
    
    // Set files on req for controller (filter only 'files' field)
    (req as any).files = files;
    
    // batchTag should already be in req.body from multer
    console.log('After multer - files:', files.map(f => ({
      originalname: f.originalname,
      mimetype: f.mimetype,
      size: f.size,
      path: f.path,
      filename: f.filename,
    })));
    
    // Check file on disk immediately
    files.forEach((f: Express.Multer.File) => {
      if (f.path && existsSync(f.path)) {
        const stats = statSync(f.path);
        console.log(`File ${f.originalname} on disk: size=${stats.size} bytes, path=${f.path}`);
        if (stats.size === 0) {
          console.error(`WARNING: File ${f.originalname} is 0 bytes! Multer may not have written the file correctly.`);
        }
      } else {
        console.error(`File ${f.originalname} NOT found on disk at: ${f.path}`);
      }
    });
    
    next();
  });
}, (req, res) => candidateController.upload(req, res));
router.get('/:id/matrix', (req, res) => candidateController.getMatrix(req, res));
router.post('/:id/rerun-matching', (req, res) => candidateController.rerunMatching(req, res));

export default router;
