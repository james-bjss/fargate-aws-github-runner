import { generateKeyPairSync, randomUUID } from 'crypto';
import nock from 'nock';
import { ActionRequestMessage, createRunnerToken } from './client';

jest.mock('../logger');
// Mock lambda config
jest.mock('../runner/config', () => {
  const module = jest.requireActual('../runner/config');
  const config = {
    ghAppId: 123,
  };
  return {
    __esModule: true,
    ...module,
    config,
    default: config,
  };
});

// Create dummy private key
const { privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem',
  },
  privateKeyEncoding: {
    type: 'pkcs1',
    format: 'pem',
  },
});
const privateKeyB64 = Buffer.from(privateKey, 'utf-8').toString('base64');

describe('Auth tests', () => {
  beforeAll(() => {
    jest.resetModules();
    jest.clearAllMocks();
    nock.disableNetConnect();
  });
  it('Should Create Runner Token', async () => {
    const runnerToken = {
      token: randomUUID(),
      expires_at: '2020-01-22T12:13:35.123-08:00',
    };

    const request: ActionRequestMessage = {
      id: 123,
      eventType: 'workflow_job',
      repositoryOwner: 'james-bjss',
      repositoryName: 'gh-webhook-test',
      installationId: 123,
      labels: ['self-hosted', 'linux', 'x64'],
    };

    //Mock repository auth flow
    nock('https://api.github.com')
      .get(
        `/repos/${request.repositoryOwner}/${request.repositoryName}/installation`
      )
      .once()
      .reply(200, { id: 123 })
      .post('/app/installations/123/access_tokens')
      .once()
      .reply(200)
      .post(
        `/repos/${request.repositoryOwner}/${request.repositoryName}/actions/runners/registration-token`
      )
      .once()
      .reply(200, runnerToken);

    expect(await createRunnerToken(privateKeyB64, false, request)).toBe(
      runnerToken.token
    );
  });
});
