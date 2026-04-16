import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { mockRequest, mockResponse } from './helpers/mockExpress.js';

const objectIdIsValidMock: any = jest.fn();
const objectIdConstructorMock: any = jest.fn().mockImplementation(function (this: any, value?: unknown) {
  this.value = String(value ?? 'mock-object-id');
  this.toString = () => this.value;
});
objectIdConstructorMock.isValid = objectIdIsValidMock;

const taskModel: any = {
  create: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndDelete: jest.fn(),
};

const projectModel: any = {
  findById: jest.fn(),
  exists: jest.fn(),
};

const projectMemberModel: any = {
  findOne: jest.fn(),
  find: jest.fn(),
};

const goalModel: any = {
  findById: jest.fn(),
};

const createNotificationsMock: any = jest.fn();

jest.unstable_mockModule('mongoose', () => ({
  default: {
    Types: {
      ObjectId: objectIdConstructorMock,
    },
  },
}));

jest.unstable_mockModule('../backend/models/Task.js', () => ({
  default: taskModel,
}));

jest.unstable_mockModule('../backend/models/Project.js', () => ({
  default: projectModel,
}));

jest.unstable_mockModule('../backend/models/ProjectMember.js', () => ({
  default: projectMemberModel,
}));

jest.unstable_mockModule('../backend/models/Goal.js', () => ({
  default: goalModel,
}));

jest.unstable_mockModule('../backend/services/notificationService.js', () => ({
  createNotifications: createNotificationsMock,
}));

const {
  createTask,
  deleteTask,
  getMyTaskContributions,
  getProjectTasks,
  getTaskById,
  getTasksTodo,
  getUserTaskContributionsById,
  updateTask,
} = await import('../backend/controllers/taskController.js');

function createPopulateChain<T>(result: T, resolveOnCall: number) {
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

function createSelectSortChain<T>(result: T) {
  const chain: any = {};
  chain.select = jest.fn(() => chain);
  chain.sort = jest.fn(() => Promise.resolve(result));
  return chain;
}

function createSortChain<T>(result: T) {
  const chain: any = {};
  chain.populate = jest.fn(() => chain);
  chain.sort = jest.fn(() => Promise.resolve(result));
  return chain;
}

describe('Task Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    objectIdIsValidMock.mockReturnValue(true);
  });

  it('returns 400 if missing projectId', async () => {
    const req = mockRequest({ body: {} });
    const res = mockResponse();

    await createTask(req as any, res as any);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('createTask creates a task and notifies assigned users', async () => {
    projectModel.findById.mockResolvedValue({ _id: 'project123' });
    projectMemberModel.findOne.mockResolvedValue({ role: 'Owner', permissions: { canCreateTasks: true } });
    projectMemberModel.find.mockReturnValueOnce({
      select: (jest.fn() as any).mockResolvedValue([{ userId: { toString: () => 'user456' } }]),
    });
    taskModel.create.mockResolvedValue({
      _id: 'task123',
      title: 'Build dashboard',
      projectId: 'project123',
      assignedToUserIds: ['user456'],
    });
    taskModel.findById.mockReturnValueOnce(
      createPopulateChain({ _id: 'task123', title: 'Build dashboard' }, 3)
    );

    const req = mockRequest({
      user: { _id: 'user123' },
      body: {
        projectId: 'project123',
        title: ' Build dashboard ',
        assignedToUserIds: ['user456'],
      },
    });
    const res = mockResponse();

    await createTask(req as any, res as any);

    expect(taskModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'project123',
        title: 'Build dashboard',
        createdBy: 'user123',
      })
    );
    expect(createNotificationsMock).toHaveBeenCalledWith([
      expect.objectContaining({ recipientUserId: 'user456', type: 'task_assigned' })
    ]);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('getProjectTasks returns project tasks for active members', async () => {
    projectMemberModel.findOne.mockResolvedValue({ role: 'Member' });
    projectModel.exists.mockResolvedValue(true);
    taskModel.find.mockReturnValueOnce(createSortChain([{ _id: 'task123' }]));

    const req = mockRequest({ params: { projectId: 'project123' }, user: { _id: 'user123' } });
    const res = mockResponse();

    await getProjectTasks(req as any, res as any);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([{ _id: 'task123' }]);
  });

  it('getTaskById returns a populated task for active members', async () => {
    taskModel.findById.mockReturnValueOnce(
      createPopulateChain({ _id: 'task123', projectId: 'project123' }, 4)
    );
    projectMemberModel.findOne.mockResolvedValue({ role: 'Member' });

    const req = mockRequest({ params: { taskId: 'task123' }, user: { _id: 'user123' } });
    const res = mockResponse();

    await getTaskById(req as any, res as any);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ _id: 'task123' }));
  });

  it('updateTask saves changes, updates completion state, and sends notifications', async () => {
    const taskDoc = {
      _id: 'task123',
      title: 'Existing task',
      description: 'old description',
      dueDate: null,
      projectId: 'project123',
      assignedToUserIds: [],
      createdBy: { toString: () => 'user123' },
      status: 'todo',
      priority: 'medium',
      tags: [],
      roleRequired: '',
      goalId: null,
      completedAt: null,
      completedBy: null,
      save: jest.fn(),
    };

    taskModel.findById
      .mockResolvedValueOnce(taskDoc)
      .mockReturnValueOnce(createPopulateChain({ _id: 'task123', title: 'Updated task' }, 3));
    projectMemberModel.findOne.mockResolvedValue({ role: 'Owner', permissions: { canCreateTasks: true } });
    projectMemberModel.find.mockReturnValueOnce({
      select: (jest.fn() as any).mockResolvedValue([{ userId: { toString: () => 'user456' } }]),
    });

    const req = mockRequest({
      params: { taskId: 'task123' },
      user: { _id: 'user123' },
      body: {
        title: ' Updated task ',
        status: 'done',
        tags: [' urgent ', ' '],
        roleRequired: ' Designer ',
        assignedToUserIds: ['user456'],
      },
    });
    const res = mockResponse();

    await updateTask(req as any, res as any);

    expect(taskDoc.title).toBe('Updated task');
    expect(taskDoc.status).toBe('done');
    expect(taskDoc.tags).toEqual(['urgent']);
    expect(taskDoc.roleRequired).toBe('Designer');
    expect(taskDoc.completedBy).not.toBeNull();
    expect(taskDoc.save).toHaveBeenCalled();
    expect(createNotificationsMock).toHaveBeenCalledTimes(2);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('deleteTask deletes a task for the owner', async () => {
    taskModel.findById.mockResolvedValue({
      _id: 'task123',
      projectId: 'project123',
      createdBy: { toString: () => 'user123' },
    });
    projectMemberModel.findOne.mockResolvedValue({ role: 'Owner' });

    const req = mockRequest({ params: { taskId: 'task123' }, user: { _id: 'user123' } });
    const res = mockResponse();

    await deleteTask(req as any, res as any);

    expect(taskModel.findByIdAndDelete).toHaveBeenCalledWith('task123');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('getMyTaskContributions returns completed tasks for the authenticated user', async () => {
    taskModel.find.mockReturnValueOnce(createSelectSortChain([{ _id: 'task123' }]));

    const req = mockRequest({ user: { _id: 'user123' } });
    const res = mockResponse();

    await getMyTaskContributions(req as any, res as any);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([{ _id: 'task123' }]);
  });

  it('getUserTaskContributionsById returns 400 for invalid user ids', async () => {
    objectIdIsValidMock.mockReturnValue(false);

    const req = mockRequest({ params: { userId: 'not-an-object-id' } });
    const res = mockResponse();

    await getUserTaskContributionsById(req as any, res as any);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('getUserTaskContributionsById returns completed tasks for a valid user id', async () => {
    taskModel.find.mockReturnValueOnce(createSelectSortChain([{ _id: 'task999' }]));

    const req = mockRequest({ params: { userId: '507f1f77bcf86cd799439011' } });
    const res = mockResponse();

    await getUserTaskContributionsById(req as any, res as any);

    expect(taskModel.find).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('getTasksTodo returns todo tasks across active memberships', async () => {
    projectMemberModel.find.mockResolvedValue([{ projectId: 'project123' }, { projectId: 'project999' }]);
    taskModel.find.mockResolvedValue([{ _id: 'task123', status: 'todo' }]);

    const req = mockRequest({ user: { _id: 'user123' } });
    const res = mockResponse();

    await getTasksTodo(req as any, res as any);

    expect(taskModel.find).toHaveBeenCalledWith({
      projectId: { $in: ['project123', 'project999'] },
      status: 'todo',
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });
});