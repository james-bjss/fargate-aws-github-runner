import {
  ECSClient,
  ListTagsForResourceCommand,
  ListTaskDefinitionFamiliesCommand,
  ListTaskDefinitionsCommand,
  ListTaskDefinitionsCommandOutput,
  RunTaskCommand,
} from '@aws-sdk/client-ecs';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import { randomUUID } from 'crypto';
import { handler } from '.';

const ecsMock = mockClient(ECSClient);

const listTaskDefinitionsResponse: ListTaskDefinitionsCommandOutput = {
  $metadata: null,
  taskDefinitionArns: [
    'arn:aws:ecs:us-east-1:012345678910:task-definition/gh_linux:4',
    'arn:aws:ecs:us-east-1:012345678910:task-definition/gh_linux:3',
    'arn:aws:ecs:us-east-1:012345678910:task-definition/gh_linux:2',
    'arn:aws:ecs:us-east-1:012345678910:task-definition/gh_linux:1',
  ],
};

describe('SQS Event', () => {
  beforeEach(() => {
    ecsMock.reset();
    ecsMock
      .on(ListTaskDefinitionsCommand)
      .resolves({
        taskDefinitionArns: [],
      })
      .on(ListTaskDefinitionsCommand, { familyPrefix: 'gh_linux' }, false)
      .resolves(listTaskDefinitionsResponse)
      .on(ListTagsForResourceCommand)
      .resolves({
        tags: [
          {
            key: 'GH:labels',
            value: 'linux,x86',
          },
        ],
      })
      .on(RunTaskCommand)
      .resolves({ failures: [] })
      .on(ListTaskDefinitionFamiliesCommand)
      .resolves({
        families: ['gh_linux'],
        nextToken: null,
      });
  });

  it('Should Process Single Event Successfully', async () => {
    const event: SQSEvent = { Records: [] };
    event.Records.push(createSqsRecord({ labels: ['linux', 'x86'] }));

    const response = await handler(event);
    expect(response.batchItemFailures).toHaveLength(0);
  });

  it('Should Process Batched Events Successfully', async () => {
    const event: SQSEvent = { Records: [] };

    // Batch of 10 messages
    for (let i = 0; i < 10; i++) {
      event.Records.push(createSqsRecord({ labels: ['linux', 'x86'] }));
    }

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
