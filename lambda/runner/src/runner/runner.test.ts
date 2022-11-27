import { SQSEvent, SQSRecord } from 'aws-lambda';
import { randomUUID } from 'crypto';
import { mocked } from 'jest-mock';
import { getMatchingTaskDefinition, startRunner } from '../ecs/client';
import CachingSSMClient from '../ssm/client';
import { processEvent } from './runner';

// Mocks
jest.mock('../logger');
jest.mock('../ecs/client');
jest.mock('../ssm/client');
jest.mock('../github/client');

describe('SQS Event', () => {
  beforeAll(() => {
    const mockSSMClient = mocked(CachingSSMClient);
    mockSSMClient.prototype.getSecretValue
      .mockImplementationOnce(async () => 'somevalue')
      .mockImplementationOnce(async () => '123');
  });

  beforeEach(() => {
    jest.resetModules();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('Should Process Single Event Successfully', async () => {
    const taskDefinition =
      'arn:aws:ecs:us-east-1:012345678910:task-definition/gh_linux:4';
    const labels = ['self-hosted', 'linux', 'x64'];
    const event: SQSEvent = { Records: [] };
    event.Records.push(createSqsRecord({ labels: labels }));

    // Configure mock reponses
    const mockEcsgetTasks = mocked(getMatchingTaskDefinition);
    mockEcsgetTasks.mockResolvedValueOnce(taskDefinition);
    const mockEcsStartRunner = mocked(startRunner);
    mockEcsStartRunner.mockResolvedValueOnce();

    const result = await processEvent(event);

    // Check no errors returned
    expect(result.batchItemFailures).toHaveLength(0);
    // Check the task and labels match
    expect(mockEcsStartRunner).toBeCalledWith(
      taskDefinition,
      expect.objectContaining({ labels: labels })
    );
  });
});

it('Should Return Failures If Message Not Processed', async () => {
  const taskDefinition =
    'arn:aws:ecs:us-east-1:012345678910:task-definition/gh_linux:4';
  const labels = ['self-hosted', 'linux', 'x64'];
  const event: SQSEvent = { Records: [] };
  event.Records.push(createSqsRecord({ labels: labels }));

  // Configure mock reponses
  const mockEcsgetTasks = mocked(getMatchingTaskDefinition);
  mockEcsgetTasks.mockResolvedValueOnce(taskDefinition);
  const mockEcsStartRunner = mocked(startRunner);
  mockEcsStartRunner.mockRejectedValueOnce(new Error('some error'));

  const result = await processEvent(event);

  // Check no errors returned
  expect(result.batchItemFailures).toHaveLength(1);
  // Check the task and labels match
  expect(mockEcsStartRunner).toBeCalledWith(
    taskDefinition,
    expect.objectContaining({ labels: labels })
  );
});

function createSqsRecord(body: object): SQSRecord {
  return {
    messageId: randomUUID(),
    receiptHandle: randomUUID(),
    body: JSON.stringify(body),
    attributes: {
      ApproximateReceiveCount: '1',
      SentTimestamp: Math.round(new Date().getTime() / 1000).toString(),
      SenderId: randomUUID(),
      ApproximateFirstReceiveTimestamp: Math.round(
        new Date().getTime() / 1000
      ).toString(),
    },
    messageAttributes: {},
    md5OfBody: 'aaabbbbccc',
    eventSource: 'aws:sqs',
    eventSourceARN: 'arn:aws:sqs:eu-west-1:123456789:action-queue',
    awsRegion: 'eu-west-1',
  };
}
