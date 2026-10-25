import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { uploadImage } from '../../middleware/upload';
import * as controller from './celebrations.controller';

export const celebrationsRouter = Router();

celebrationsRouter.use(authenticate);

celebrationsRouter.get('/', controller.list);
celebrationsRouter.get('/today', controller.listToday); // חייב להופיע לפני /:id
celebrationsRouter.post('/', controller.create);
celebrationsRouter.get('/:id', controller.getOne);
celebrationsRouter.put('/:id', controller.update);
celebrationsRouter.delete('/:id', controller.remove);
celebrationsRouter.put('/:id/image', uploadImage, controller.setImage);
celebrationsRouter.delete('/:id/image', controller.removeImage);

/** כתובת התמונות - פתוחה (המזהה האקראי הוא שמגן עליה) */
export const imagesRouter = Router();
imagesRouter.get('/:imageKey', controller.getImage);
