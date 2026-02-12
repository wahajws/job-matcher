import { Router } from 'express';
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { profileController } from '../controllers/profileController.js';
import { authenticateToken, requireCandidate, requireCompany } from '../middleware/auth.js';
import { uploadLimiter } from '../middleware/rateLimit.js';

const router = Router();

// Ensure upload directories exist
const uploadsDir = path.join(process.cwd(), 'uploads');
const photosDir = path.join(uploadsDir, 'photos');
const logosDir = path.join(uploadsDir, 'logos');

[uploadsDir, photosDir, logosDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Multer config for photo uploads
const photoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, photosDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  },
});

const logoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, logosDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  },
});

const imageFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, WebP, and GIF images are allowed'));
  }
};

const uploadPhoto = multer({
  storage: photoStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB for photos
});

const uploadLogo = multer({
  storage: logoStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB for logos
});

// ==================== CANDIDATE PROFILE ====================
router.get(
  '/candidate/profile',
  authenticateToken,
  requireCandidate,
  (req, res) => profileController.getCandidateProfile(req as any, res)
);

router.put(
  '/candidate/profile',
  authenticateToken,
  requireCandidate,
  express.json(),
  (req, res) => profileController.updateCandidateProfile(req as any, res)
);

router.post(
  '/candidate/profile/photo',
  authenticateToken,
  requireCandidate,
  uploadLimiter,
  uploadPhoto.single('photo'),
  (req, res) => profileController.uploadCandidatePhoto(req as any, res)
);

// ==================== PRIVACY SETTINGS ====================
router.get(
  '/candidate/profile/privacy',
  authenticateToken,
  requireCandidate,
  (req, res) => profileController.getPrivacySettings(req as any, res)
);

router.put(
  '/candidate/profile/privacy',
  authenticateToken,
  requireCandidate,
  express.json(),
  (req, res) => profileController.updatePrivacySettings(req as any, res)
);

// ==================== COMPANY PROFILE ====================
router.get(
  '/company/profile',
  authenticateToken,
  requireCompany,
  (req, res) => profileController.getCompanyProfile(req as any, res)
);

router.put(
  '/company/profile',
  authenticateToken,
  requireCompany,
  express.json(),
  (req, res) => profileController.updateCompanyProfile(req as any, res)
);

router.post(
  '/company/profile/logo',
  authenticateToken,
  requireCompany,
  uploadLimiter,
  uploadLogo.single('logo'),
  (req, res) => profileController.uploadCompanyLogo(req as any, res)
);

export default router;
