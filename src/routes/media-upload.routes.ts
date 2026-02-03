import { Router } from 'express';
import { uploadMedia } from '../controllers/media-upload.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { upload } from '../middlewares/multer.middleware';
import { validateSchema } from '../middlewares/schema-validator.middleware';
import { uploadMediaSchema } from '../validations/media-upload.validations';

const mediaUploadRouter = Router();

mediaUploadRouter.post('/', authenticateToken, upload.array('files'), validateSchema(uploadMediaSchema, 'body'), uploadMedia);

export default mediaUploadRouter;


