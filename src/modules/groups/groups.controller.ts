import type { Request, Response } from 'express';
import { getAuthUser } from '../../auth/auth-user';
import { parse } from '../../validation/zod-setup';
import {
  createGroupSchema,
  groupCelebrationParamsSchema,
  groupParamsSchema,
  joinGroupSchema,
  memberParamsSchema,
  renameGroupSchema,
} from './groups.schemas';
import * as groupsService from './groups.service';

export async function listMyGroups(req: Request, res: Response) {
  res.json(await groupsService.listMyGroups(getAuthUser(req).id));
}

export async function createGroup(req: Request, res: Response) {
  const { name } = parse(createGroupSchema, req.body);
  res.status(201).json(await groupsService.createGroup(getAuthUser(req).id, name));
}

export async function joinGroup(req: Request, res: Response) {
  const { joinCode } = parse(joinGroupSchema, req.body);
  res.json(await groupsService.joinGroup(getAuthUser(req).id, joinCode));
}

export async function getGroup(req: Request, res: Response) {
  const { groupId } = parse(groupParamsSchema, req.params);
  res.json(await groupsService.getGroup(getAuthUser(req).id, groupId));
}

export async function renameGroup(req: Request, res: Response) {
  const { groupId } = parse(groupParamsSchema, req.params);
  const { name } = parse(renameGroupSchema, req.body);
  res.json(await groupsService.renameGroup(getAuthUser(req).id, groupId, name));
}

export async function regenerateJoinCode(req: Request, res: Response) {
  const { groupId } = parse(groupParamsSchema, req.params);
  res.json(await groupsService.regenerateJoinCode(getAuthUser(req).id, groupId));
}

export async function deleteGroup(req: Request, res: Response) {
  const { groupId } = parse(groupParamsSchema, req.params);
  await groupsService.deleteGroup(getAuthUser(req).id, groupId);
  res.status(204).end();
}

export async function listMembers(req: Request, res: Response) {
  const { groupId } = parse(groupParamsSchema, req.params);
  res.json(await groupsService.listMembers(getAuthUser(req).id, groupId));
}

export async function removeMember(req: Request, res: Response) {
  const { groupId, userId } = parse(memberParamsSchema, req.params);
  await groupsService.removeMember(getAuthUser(req).id, groupId, userId);
  res.status(204).end();
}

export async function leaveGroup(req: Request, res: Response) {
  const { groupId } = parse(groupParamsSchema, req.params);
  res.json(await groupsService.leaveGroup(getAuthUser(req).id, groupId));
}

export async function removeCelebrationFromGroup(req: Request, res: Response) {
  const { groupId, celebrationId } = parse(groupCelebrationParamsSchema, req.params);
  await groupsService.removeCelebrationFromGroup(getAuthUser(req).id, groupId, celebrationId);
  res.status(204).end();
}
