import { apiClient } from '@/src/base/services/remote/apiClient';
import { verifyLogin } from '../appAuthApi';

jest.mock('@/src/base/services/remote/apiClient', () => ({
  apiClient: { postWithoutAuth: jest.fn() },
}));

const post = apiClient.postWithoutAuth as jest.Mock;
const verify = () => verifyLogin('store-1', '9876543210', '123456', 'device-1');

beforeEach(() => post.mockReset());

it.each([
  { statusCode: 400, code: 'INVALID_OTP', message: 'Invalid OTP' },
  { statusCode: 401, message: 'Incorrect OTP' },
  { statusCode: 404, message: 'OTP session not found' },
  { statusCode: 422, message: 'Expired OTP' },
  { statusCode: 429, message: 'Too many attempts' },
])('keeps a $statusCode verification error on the OTP step: $message', async (error) => {
  post.mockRejectedValueOnce(error);
  await expect(verify()).rejects.toEqual(error);
});

it('routes only an explicit unregistered user error to signup', async () => {
  post.mockRejectedValueOnce({ statusCode: 404, code: 'USER_NOT_FOUND', message: 'User not found' });
  await expect(verify()).resolves.toEqual({ status: 'new_user' });
  post.mockRejectedValueOnce({ statusCode: 400, message: 'Phone number not registered' });
  await expect(verify()).resolves.toEqual({ status: 'new_user' });
});

it('rejects an error-shaped successful response instead of opening signup', async () => {
  post.mockResolvedValueOnce({ success: false, message: 'Invalid OTP' });
  await expect(verify()).rejects.toThrow('Invalid OTP');
  post.mockResolvedValueOnce({ code: 'OTP_EXPIRED', message: 'Expired code' });
  await expect(verify()).rejects.toThrow('Expired code');
});

it('preserves existing-user login and verified new-user responses', async () => {
  post.mockResolvedValueOnce({ data: { accessToken: 'access', refreshToken: 'refresh' } });
  await expect(verify()).resolves.toMatchObject({ status: 'ok', tokens: { accessToken: 'access' } });
  post.mockResolvedValueOnce({ data: { message: 'Verification successful' } });
  await expect(verify()).resolves.toEqual({ status: 'new_user' });
});
