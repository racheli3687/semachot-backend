import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import * as controller from './groups.controller';

export const groupsRouter = Router();

// כל הכתובות של הקבוצות דורשות התחברות
groupsRouter.use(authenticate);

groupsRouter.get('/', controller.listMyGroups);
groupsRouter.post('/', controller.createGroup);
groupsRouter.post('/join', controller.joinGroup);

groupsRouter.get('/:groupId', controller.getGroup);
groupsRouter.patch('/:groupId', controller.renameGroup);
groupsRouter.delete('/:groupId', controller.deleteGroup);
groupsRouter.post('/:groupId/join-code', controller.regenerateJoinCode);
groupsRouter.post('/:groupId/leave', controller.leaveGroup);

groupsRouter.get('/:groupId/members', controller.listMembers);
groupsRouter.delete('/:groupId/members/:userId', controller.removeMember);

groupsRouter.delete('/:groupId/celebrations/:celebrationId', controller.removeCelebrationFromGroup);
