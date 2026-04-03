import multer from 'multer';
import path from 'path';
import fs from 'fs';

fs.mkdirSync('public/uploads', { recursive: true }); // This was added to ensure the folder exists

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/'); // This folder must exist in the root, but code on top already creates it
    },
    filename: (req, file, cb) => {
        // Create a unique filename: timestamp + original extension
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

export const upload = multer({ storage: storage });