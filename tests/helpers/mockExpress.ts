import { jest } from '@jest/globals';

export const mockRequest = (overrides: any = {}) => ({
  body: {},
  params: {},
  query: {},
  user: null,
  cookies: {},
  ...overrides,
});

export const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.redirect = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  return res;
};