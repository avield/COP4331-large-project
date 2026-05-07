import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { mockRequest, mockResponse } from './helpers/mockExpress.js';

const projectModel: any = {
  findById: jest.fn(),
  find: jest.fn(),
  findByIdAndDelete: jest.fn(),
  create: jest.fn(),
};

const projectMemberModel: any = {
  findOne: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn(),
  deleteMany: jest.fn(),
  create: jest.fn(),
  insertMany: jest.fn(),
};

const taskModel: any = {
  find: jest.fn(),
  deleteMany: jest.fn(),
};

const goalModel: any = {
  find: jest.fn(),
  deleteMany: jest.fn(),
  insertMany: jest.fn(),
};

const projectChatMessageModel: any = {
  deleteMany: jest.fn(),
};

const createNotificationsMock: any = jest.fn();

const mockSession: any = {
  withTransaction: jest.fn(),
  endSession: jest.fn(),
};

const mockStartSession: any = jest.fn<() => Promise<any>>();
mockStartSession.mockResolvedValue(mockSession);

jest.unstable_mockModule('../backend/models/Project.js', () => ({
  default: projectModel,
}));

jest.unstable_mockModule('../backend/models/ProjectMember.js', () => ({
  default: projectMemberModel,
}));

jest.unstable_mockModule('../backend/models/Task.js', () => ({
  default: taskModel,
}));

jest.unstable_mockModule('../backend/models/Goal.js', () => ({
  default: goalModel,
}));

jest.unstable_mockModule('../backend/models/ProjectChatMessage.js', () => ({
  default: projectChatMessageModel,
}));

jest.unstable_mockModule('mongoose', () => ({
  default: {
    startSession: mockStartSession,
  },
}));

jest.unstable_mockModule('../backend/services/notificationService.js', () => ({
  createNotifications: createNotificationsMock,
}));

const {
  createProject,
  deleteProject,
  getManageableProjects,
  getMyProjects,
  getProjectById,
  getProjectDetails,
  updateProject,
} = await import('../backend/controllers/projectController.js');

function createPopulateChain<T>(result: T, resolveOnCall = 1) {
  let populateCalls = 0;
  const chain: any = {};

  chain.populate = jest.fn(() => {
    populateCalls += 1;
    if (populateCalls >= resolveOnCall) {
      return Promise.resolve(result);
    }

    return chain;
  });

  chain.select = jest.fn(() => Promise.resolve(result));
  chain.sort = jest.fn(() => Promise.resolve(result));

  return chain;
}

function createSortChain<T>(result: T) {
  const chain: any = {};
  chain.populate = jest.fn(() => chain);
  chain.select = jest.fn(() => Promise.resolve(result));
  chain.sort = jest.fn(() => Promise.resolve(result));
  return chain;
}

describe('Project Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSession.withTransaction.mockImplementation(async (callback: () => Promise<void>) => {
      await callback();
    });
  });

  it('getProjectById returns 500 if no user because requireUser throws', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const req = mockRequest({ params: { projectId: '123' }, user: null });
    const res = mockResponse();

    await getProjectById(req as any, res as any);

    expect(res.status).toHaveBeenCalledWith(500);

    consoleSpy.mockRestore();
  });

  it('createProject returns 400 if name is missing', async () => {
    const req = mockRequest({
      body: {},
      user: { _id: 'user123' },
    });
    const res = mockResponse();

    await createProject(req as any, res as any);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Project name is required.'
    });
  });

  it('createProject creates owner membership, goals, and invitation notifications', async () => {
    projectModel.create.mockResolvedValue([{ _id: 'project123' }]);
    projectModel.findById.mockReturnValueOnce(
      createPopulateChain({ _id: 'project123', name: 'Build Platform' })
    );

    const req = mockRequest({
      user: { _id: 'user123' },
      body: {
        name: '  Build Platform  ',
        visibility: 'public',
        goals: [{ title: ' First Goal ', description: ' Keep scope clear ' }],
        invitedMembers: [{ userId: 'user999' }],
      },
    });
    const res = mockResponse();

    await createProject(req as any, res as any);

    expect(projectModel.create).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          name: 'Build Platform',
          createdBy: 'user123',
          visibility: 'public',
          recruitingStatus: 'open',
        })
      ],
      { session: mockSession }
    );
    expect(projectMemberModel.create).toHaveBeenCalled();
    expect(projectMemberModel.insertMany).toHaveBeenCalled();
    expect(goalModel.insertMany).toHaveBeenCalled();
    expect(createNotificationsMock).toHaveBeenCalledWith([
      expect.objectContaining({
        recipientUserId: 'user999',
        actorUserId: 'user123',
        type: 'project_invitation',
      })
    ]);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('getMyProjects returns enriched project summaries', async () => {
    projectMemberModel.find.mockReturnValueOnce({
      select: (jest.fn() as any).mockResolvedValue([{ projectId: 'project123' }]),
    });
    projectModel.find.mockReturnValueOnce(
      createSortChain([
        {
          _id: 'project123',
          toObject: () => ({ _id: 'project123', name: 'Project One' }),
        },
      ])
    );
    projectMemberModel.countDocuments.mockResolvedValue(3);
    taskModel.find.mockReturnValueOnce({
      select: (jest.fn() as any).mockResolvedValue([{ status: 'todo' }, { status: 'done' }]),
    });

    const req = mockRequest({ user: { _id: 'user123' } });
    const res = mockResponse();

    await getMyProjects(req as any, res as any);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([
      expect.objectContaining({
        name: 'Project One',
        memberCount: 3,
        taskCounts: expect.objectContaining({ total: 2, todo: 1, done: 1 }),
      })
    ]);
  });

  it('getManageableProjects returns 401 when no authenticated user exists', async () => {
    const req = mockRequest({ user: null });
    const res = mockResponse();

    await getManageableProjects(req as any, res as any);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Not authorized' });
  });

  it('getProjectById returns public details to a non-member visitor', async () => {
    projectModel.findById.mockReturnValueOnce(
      createPopulateChain({
        visibility: 'public',
        toObject: () => ({ _id: 'project123', name: 'Public Project' }),
      })
    );
    projectMemberModel.findOne.mockResolvedValue(null);

    const req = mockRequest({ params: { projectId: 'project123' }, user: { _id: 'user123' } });
    const res = mockResponse();

    await getProjectById(req as any, res as any);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Public Project', isFullDetails: false })
    );
  });

  it('updateProject returns 403 if user is not an active member', async () => {
    projectMemberModel.findOne.mockResolvedValue(null);

    const req = mockRequest({
      params: { projectId: 'project123' },
      body: { name: 'Updated Name' },
      user: { _id: 'user123' },
    });
    const res = mockResponse();

    await updateProject(req as any, res as any);

    expect(projectMemberModel.findOne).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Access denied.'
    });
  });

  it('updateProject saves changes and notifies other active members on status change', async () => {
    const projectDoc = {
      _id: 'project123',
      name: 'Old Project',
      description: 'old',
      visibility: 'private',
      dueDate: null,
      recruitingStatus: 'closed',
      status: 'active',
      tags: [],
      lookingForRoles: [],
      settings: { allowSelfJoinRequests: false, requireApprovalToJoin: false, inviteOnly: true },
      save: jest.fn(),
    };

    projectMemberModel.findOne.mockResolvedValue({
      role: 'Owner',
      permissions: { canEditProject: true },
    });
    projectModel.findById.mockResolvedValue(projectDoc);
    projectMemberModel.find.mockReturnValueOnce({
      select: (jest.fn() as any).mockResolvedValue([
        { userId: { toString: () => 'member-2' } },
        { userId: { toString: () => 'user123' } },
      ]),
    });

    const req = mockRequest({
      params: { projectId: 'project123' },
      body: {
        name: ' Renamed Project ',
        status: 'completed',
        tags: [' frontend ', ' '],
        settings: { inviteOnly: true },
      },
      user: { _id: 'user123' },
    });
    const res = mockResponse();

    await updateProject(req as any, res as any);

    expect(projectDoc.name).toBe('Renamed Project');
    expect(projectDoc.status).toBe('completed');
    expect(projectDoc.tags).toEqual(['frontend']);
    expect(projectDoc.save).toHaveBeenCalled();
    expect(createNotificationsMock).toHaveBeenCalledWith([
      expect.objectContaining({ recipientUserId: 'member-2', type: 'project_status_changed' })
    ]);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('deleteProject returns 403 if user is not the owner', async () => {
    projectMemberModel.findOne.mockResolvedValue({
      role: 'Member',
    });

    const req = mockRequest({
      params: { projectId: 'project123' },
      user: { _id: 'user123' },
    });
    const res = mockResponse();

    await deleteProject(req as any, res as any);

    expect(projectMemberModel.findOne).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Only the project owner can delete this project.'
    });
  });

  it('deleteProject removes project data when requested by the owner', async () => {
    projectMemberModel.findOne.mockResolvedValue({ role: 'Owner' });
    projectModel.findById.mockResolvedValue({ _id: 'project123' });

    const req = mockRequest({
      params: { projectId: 'project123' },
      user: { _id: 'user123' },
    });
    const res = mockResponse();

    await deleteProject(req as any, res as any);

    expect(taskModel.deleteMany).toHaveBeenCalledWith({ projectId: 'project123' });
    expect(goalModel.deleteMany).toHaveBeenCalledWith({ projectId: 'project123' });
    expect(projectChatMessageModel.deleteMany).toHaveBeenCalledWith({ projectId: 'project123' });
    expect(projectMemberModel.deleteMany).toHaveBeenCalledWith({ projectId: 'project123' });
    expect(projectModel.findByIdAndDelete).toHaveBeenCalledWith('project123');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('getProjectDetails returns a visitor view for public projects', async () => {
    projectModel.findById.mockReturnValueOnce(
      createPopulateChain({ _id: 'project123', visibility: 'public' })
    );
    projectMemberModel.findOne.mockReturnValueOnce(createPopulateChain(null, 2));

    const req = mockRequest({ params: { projectId: 'project123' }, user: { _id: 'user123' } });
    const res = mockResponse();

    await getProjectDetails(req as any, res as any);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ isFullDetails: false, message: 'Public visitor view.' })
    );
  });
});
