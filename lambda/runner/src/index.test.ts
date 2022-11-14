import { SQSEvent, SQSRecord } from 'aws-lambda';
import { randomUUID } from 'crypto';
import { mocked } from 'jest-mock';
import { handler } from '.';
import { processEvent } from './runner/runner';

// Mock call to the runner
jest.mock('./logger');
jest.mock('./runner/runner');
describe('SQS Event', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('Should Process a Single Event Successfully', async () => {
    const event: SQSEvent = { Records: [] };
    event.Records.push(createSqsRecord({ labels: ['linux', 'x86'] }));

    const mockWebhook = mocked(processEvent);
    mockWebhook.mockResolvedValueOnce({ batchItemFailures: [] });

    const response = await handler(event);
    expect(response.batchItemFailures).toHaveLength(0);
  });

  it('Should Process Batched Events Successfully', async () => {
    const event: SQSEvent = { Records: [] };

    // Batch of 10 messages
    for (let i = 0; i < 10; i++) {
      event.Records.push(createSqsRecord({ labels: ['linux', 'x86'] }));
    }

    const mockWebhook = mocked(processEvent);
    mockWebhook.mockResolvedValueOnce({ batchItemFailures: [] });

    const response = await handler(event);
    expect(response.batchItemFailures).toHaveLength(0);
  });

  it('Should Handle Exceptions', async () => {
    const event: SQSEvent = { Records: [] };
    event.Records.push(createSqsRecord({ labels: ['linux', 'x86'] }));

    const mockWebhook = mocked(processEvent);
    mockWebhook.mockRejectedValueOnce(new Error('some error'));

    const response = await handler(event);
    expect(response.batchItemFailures).toHaveLength(0);
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
