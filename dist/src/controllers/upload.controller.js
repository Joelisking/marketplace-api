import { generateUploadUrl, deleteImage, UploadRequestSchema, DeleteRequestSchema, } from '../services/upload.service';
/**
 * Generate a presigned URL for image upload
 */
export async function getUploadUrl(req, res) {
    try {
        const body = UploadRequestSchema.parse(req.body);
        const result = await generateUploadUrl(body);
        res.json({
            uploadUrl: result.uploadUrl,
            fileUrl: result.fileUrl,
            fileName: result.fileName,
            expiresIn: 3600, // 1 hour
        });
    }
    catch (error) {
        if (error instanceof Error) {
            res.status(400).json({
                message: 'Invalid upload request',
                error: error.message,
            });
        }
        else {
            res.status(500).json({
                message: 'Internal server error',
            });
        }
    }
}
/**
 * Delete an uploaded image
 */
export async function deleteUploadedImage(req, res) {
    try {
        const body = DeleteRequestSchema.parse(req.body);
        await deleteImage(body);
        res.json({
            message: 'Image deleted successfully',
        });
    }
    catch (error) {
        if (error instanceof Error) {
            res.status(400).json({
                message: 'Invalid delete request',
                error: error.message,
            });
        }
        else {
            res.status(500).json({
                message: 'Internal server error',
            });
        }
    }
}
