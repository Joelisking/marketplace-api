var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { generateUploadUrl, deleteImage, UploadRequestSchema, DeleteRequestSchema, } from '../services/upload.service';
/**
 * Generate a presigned URL for image upload
 */
export function getUploadUrl(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const body = UploadRequestSchema.parse(req.body);
            const result = yield generateUploadUrl(body);
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
    });
}
/**
 * Delete an uploaded image
 */
export function deleteUploadedImage(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const body = DeleteRequestSchema.parse(req.body);
            yield deleteImage(body);
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
    });
}
