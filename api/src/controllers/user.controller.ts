import { Response } from 'express';

import { userService } from '../services/user.service';
import type { AuthenticatedRequest } from '../types/http';
import type {
  ListUsersQuery,
  UpdateUserInput,
  CreateUserInput,
  UpdateUserRoleInput,
} from '../schemas/user.schema';
import { successResponse } from '../utils/api-response';

export const userController = {
  list: async (req: AuthenticatedRequest, res: Response) => {
    const query = req.query as ListUsersQuery;
    const users = await userService.list(req.user!, query);
    res
      .status(200)
      .json(successResponse(users.data, { meta: users.meta }));
  },

  getById: async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params as unknown as { id: number };
    const user = await userService.getById(id, req.user!);
    res.status(200).json(successResponse(user));
  },

  create: async (req: AuthenticatedRequest, res: Response) => {
    const payload = req.body as CreateUserInput;
    const user = await userService.create(payload, req.user!);

    res
      .status(201)
      .json(successResponse(user, { message: 'User created successfully' }));
  },

  update: async (req: AuthenticatedRequest, res: Response) => {
    const payload = req.body as UpdateUserInput;
    const { id } = req.params as unknown as { id: number };
    const user = await userService.update(id, payload, req.user!);

    res
      .status(200)
      .json(successResponse(user, { message: 'User updated successfully' }));
  },

  updateRole: async (req: AuthenticatedRequest, res: Response) => {
    const payload = req.body as UpdateUserRoleInput;
    const { id } = req.params as unknown as { id: number };
    const user = await userService.updateRole(id, payload, req.user!);

    res
      .status(200)
      .json(successResponse(user, { message: 'User role updated successfully' }));
  },

  remove: async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params as unknown as { id: number };
    await userService.remove(id, req.user!);
    res.status(204).send();
  },
};
