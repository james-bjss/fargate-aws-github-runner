import { GetParameterCommand, SSM, SSMClient } from '@aws-sdk/client-ssm';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';
import { CachingSSMClient } from './client';

describe('SSM Client', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('Should Read SSM Key', async () => {
    // Mock SSM response
    const key = '/gh_action/webhook_secret';
    const secret = 'somesecret';
    const ssmMock = mockClient(SSMClient);
    ssmMock
      .on(GetParameterCommand, {
        Name: '/gh_action/webhook_secret',
        WithDecryption: true,
      })
      .resolves({
        Parameter: {
          Value: secret,
        },
      });
    const ssmClient = new SSM({});

    // Action
    const client = new CachingSSMClient(ssmClient);
    const secretResult = await client.getSecretValue(key);

    //Assert
    expect(ssmMock).toHaveReceivedCommandTimes(GetParameterCommand, 1);
    expect(secretResult).toBe(secret);
  });

  it('Should cache SSM Key if within TTL', async () => {
    // Mock SSM response
    const ttl = 60; //cache for 60 seconds
    const key = '/gh_action/webhook_secret';
    const secret = 'somesecret';
    const ssmMock = mockClient(SSMClient);
    ssmMock
      .on(GetParameterCommand, {
        Name: '/gh_action/webhook_secret',
        WithDecryption: true,
      })
      .resolvesOnce({
        Parameter: {
          Value: secret,
        },
      })
      .resolvesOnce({
        Parameter: {
          Value: 'a different value',
        },
      });
    const ssmClient = new SSM({});
    const client = new CachingSSMClient(ssmClient, ttl);

    //Assert first read
    expect(await client.getSecretValue(key)).toBe(secret);
    expect(ssmMock).toHaveReceivedCommandTimes(GetParameterCommand, 1);

    // Mock new time 30 seconds in the future (less than TTL)
    const newTime = new Date();
    newTime.setSeconds(newTime.getSeconds() + 30);
    jest.useFakeTimers().setSystemTime(newTime);

    // Assert Second Read
    expect(await client.getSecretValue(key)).toBe(secret);
    expect(ssmMock).toHaveReceivedCommandTimes(GetParameterCommand, 1);
  });

  it('Should refetch key if expired', async () => {
    // Mock SSM response
    const ttl = 60; //cache for 60 seconds
    const key = '/gh_action/webhook_secret';
    const secret1 = 'first secret';
    const secret2 = 'new secret value';

    const ssmMock = mockClient(SSMClient);
    ssmMock
      .on(GetParameterCommand, {
        Name: '/gh_action/webhook_secret',
        WithDecryption: true,
      })
      .resolvesOnce({
        Parameter: {
          Value: secret1,
        },
      })
      .resolvesOnce({
        Parameter: {
          Value: secret2,
        },
      });
    const ssmClient = new SSM({});
    const client = new CachingSSMClient(ssmClient, ttl);

    //Assert first read
    expect(await client.getSecretValue(key)).toBe(secret1);
    expect(ssmMock).toHaveReceivedCommandTimes(GetParameterCommand, 1);

    // Mock new time when key expired
    const newTime = new Date();
    newTime.setSeconds(newTime.getSeconds() + ttl);
    jest.useFakeTimers().setSystemTime(newTime);

    // Assert Second Read
    expect(await client.getSecretValue(key)).toBe(secret2);
    expect(ssmMock).toHaveReceivedCommandTimes(GetParameterCommand, 2);
  });

  it("Should throw error if key can't be fetched", async () => {
    // Mock SSM response
    const key = '/gh_action/webhook_secret';
    const ssmMock = mockClient(SSMClient);
    ssmMock
      .on(GetParameterCommand, {
        Name: key,
        WithDecryption: true,
      })
      .rejects();

    const ssmClient = new SSM({});

    // Action
    const client = new CachingSSMClient(ssmClient);
    await expect(client.getSecretValue(key)).rejects.toThrowError();

    //Assert
    expect(ssmMock).toHaveReceivedCommandTimes(GetParameterCommand, 1);
  });
});
