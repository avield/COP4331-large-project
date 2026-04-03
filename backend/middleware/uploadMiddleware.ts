import multer from 'multer';
import path from 'path';
import fs from 'fs';

fs.mkdirSync('public/uploads', { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/'); // Ensure this folder exists in your root
    },
    filename: (req, file, cb) => {
        // Create a unique filename: timestamp + original extension
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

export const upload = multer({ storage: storage });