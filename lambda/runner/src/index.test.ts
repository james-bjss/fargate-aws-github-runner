import { SQSEvent, SQSRecord } from 'aws-lambda';
import { randomUUID } from 'crypto';
import { handler } from '.';

describe('SQS Event', () => {
  it('Should Process Single Event Successfully', async () => {
    const event: SQSEvent = { Records: [] };
    event.Records.push(createSqsRecord());

    const response = await handler(event);
    expect(response.batchItemFailures).toHaveLength(0);
  });

  it('Should Process Batched Events Successfully', async () => {
    const event: SQSEvent = { Records: [] };

    // Batch of 10 messages
    for (let i = 0; i < 10; i++) {
      event.Records.push(createSqsRecord());
    }

    const response = await handler(event);
    expect(response.batchItemFailures).toHaveLength(0);
  });
});

function createSqsRecord(body: string = ''): SQSRecord {
  return {
    messageId: randomUUID(),
    receiptHandle: randomUUID(),
    body: body,
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
