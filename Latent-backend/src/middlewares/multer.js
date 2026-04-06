import multer from 'multer';

// Tell Multer to hold the file in memory, NOT on your hard drive
const storage = multer.memoryStorage();

// Create the upload middleware
export const upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});