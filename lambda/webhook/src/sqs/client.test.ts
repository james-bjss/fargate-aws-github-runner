import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';
import { ActionRequestMessage, sendActionRequest } from './client';

describe('Write to SQS', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('Should write message to SQS', async () => {
    const actionMessage: ActionRequestMessage = {
      id: 123,
      eventType: 'workflow_event',
      repositoryName: 'somerepo',
      repositoryOwner: 'someowner',
      installationId: 123,
      labels: ['label1', 'label2', 'label3'],
    };

    const sqsMock = mockClient(SQSClient);
    sqsMock.on(SendMessageCommand).resolvesOnce({
      MessageId: '5fea7756-0ea4-451a-a703-a558b933e274',
    });
    expect(sendActionRequest(actionMessage)).resolves;
    expect(sqsMock).toHaveReceivedCommandTimes(SendMessageCommand, 1);
  });

  it('Should handle a failure to write to SQS', async () => {
    const actionMessage: ActionRequestMessage = {
      id: 123,
      eventType: 'workflow_event',
      repositoryName: 'somerepo',
      repositoryOwner: 'someowner',
      installationId: 123,
      labels: ['label1', 'label2', 'label3'],
    };

    const sqsMock = mockClient(SQSClient);
    sqsMock.on(SendMessageCommand).rejectsOnce();
    expect(sendActionRequest(actionMessage)).rejects.toThrowError();
    expect(sqsMock).toHaveReceivedCommandTimes(SendMessageCommand, 1);
  });
});
