import { SQSEvent, SQSRecord } from 'aws-lambda';
import { randomUUID } from 'crypto';
import { mocked } from 'jest-mock';
import { getMatchingTaskDefinition } from '../ecs/client';
import { processEvent } from './runner';

// Mocks
jest.mock('../ecs/client');
// jest.mock('../ssm/client');
jest.mock('../github/client');

// eslint-disable-next-line prefer-const
//let mockGetSecretValue = jest.fn();

describe('SQS Event', () => {
  beforeAll(() => {
    jest.mock('../ssm/client', () => {
      return {
        __esModule: true,
        default: jest.fn().mockImplementation(() => {
          return {
            getSecretValue: async () => {
              return 'testing123';
            },
          };
        }),
      };
    });
  });

  beforeEach(() => {
    jest.resetModules();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('Should Process Single Event Successfully', async () => {
    const event: SQSEvent = { Records: [] };
    event.Records.push(createSqsRecord({ labels: ['linux', 'x86'] }));


    // Configure mock reponses
    const mockEcsClient = mocked(getMatchingTaskDefinition);
    mockEcsClient.mockResolvedValueOnce(
      'arn:aws:ecs:us-east-1:012345678910:task-definition/gh_linux:4'
    );
    await processEvent(event);
  });
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
