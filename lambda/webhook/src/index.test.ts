import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';
import { Webhooks } from '@octokit/webhooks';
import { APIGatewayEvent } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';
import * as crypto from 'crypto';
import { mock } from 'jest-mock-extended';
import { handler } from '.';
import workflowjob_event from '../test/resources/workflowjob_event.json';

const ssmMock = mockClient(SSMClient);
const sqsMock = mockClient(SQSClient);

// Random Key for Testing
const secret = crypto.randomBytes(32).toString('hex');

// Mock lambda config
jest.mock('./config', () => {
  const config = {
    secretTtl: 1,
    ssmkey: '/gh_action/webhook_secret',
  };

  return {
    __esModule: true,
    config,
    default: config,
  };
});

describe('Webhook', () => {
  beforeEach(() => {
    sqsMock.reset();
    ssmMock.reset();

    // Mock SSM
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

    sqsMock.on(SendMessageCommand).resolves({
      MessageId: '12345678-4444-5555-6666-123456789123',
    });
    jest.resetModules();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('Handler Test', async () => {
    const event = await createSignedEvent(
      workflowjob_event,
      'workflow_job',
      secret
    );

    const reponse = await handler(event);
    expect(ssmMock).toHaveReceivedCommandTimes(GetParameterCommand, 1);
    expect(sqsMock).toHaveReceivedCommandTimes(SendMessageCommand, 1);
    expect(reponse.statusCode).toBe(200);
  });

  it('Rejects Unsupported Event Types', async () => {
    const event = await createSignedEvent({}, 'push', secret);
    const reponse = await handler(event);
    expect(reponse.statusCode).toBe(422);
  });

  it('Rejects Events Signed With The Wrong Secret', async () => {
    const event = await createSignedEvent(
      workflowjob_event,
      'workflow_job',
      'invalidsecret'
    );
    const reponse = await handler(event);
    expect(reponse.statusCode).toBe(401);
  });

  it('Rejects Events With No Signature', async () => {
    const event = mock<APIGatewayEvent>();
    event.body = JSON.stringify(workflowjob_event);
    event.headers['x-github-event'] = 'workflow_job';
    const reponse = await handler(event);
    expect(reponse.statusCode).toBe(401);
  });
});

async function createSignedEvent(
  body: object,
  eventType: string,
  secret: string
): Promise<APIGatewayEvent> {
  const webhooks = new Webhooks({
    secret: secret,
  });
  const event = mock<APIGatewayEvent>();
  event.body = JSON.stringify(body);
  event.headers['x-github-event'] = eventType;
  event.headers['x-hub-signature-256'] = await webhooks.sign(event.body);
  return event;
}
