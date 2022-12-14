import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';
import { Webhooks } from '@octokit/webhooks';
import { APIGatewayEvent } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';
import * as crypto from 'crypto';
import { mock } from 'jest-mock-extended';
import workflowjob_event from '../../test/resources/workflowjob_event.json';
import { processEvent } from './webhook';

const ssmMock = mockClient(SSMClient);
const sqsMock = mockClient(SQSClient);

// Random Key for Testing
const secret = crypto.randomBytes(32).toString('hex');

// Mock lambda config
jest.mock('./config', () => {
  const module = jest.requireActual('./config');
  const config = {
    secretTtl: 0,
    ssmkey: '/gh_action/webhook_secret',
    sqsUrl: 'http://localhost',
  };
  return {
    __esModule: true,
    ...module,
    config,
    default: config,
  };
});

describe('Webhook', () => {
  beforeEach(() => {
    jest.resetModules();
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
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('Valid Events Are Queued', async () => {
    const event = await createSignedEvent(
      workflowjob_event,
      'workflow_job',
      secret
    );

    const reponse = await processEvent(event.headers, JSON.parse(event.body));
    expect(ssmMock).toHaveReceivedCommandTimes(GetParameterCommand, 1);
    expect(sqsMock).toHaveReceivedCommandTimes(SendMessageCommand, 1);
    expect(reponse.statusCode).toBe(200);
  });

  it('Message is Ignored if action is completed', async () => {
    const completedJobEvent = JSON.parse(JSON.stringify(workflowjob_event));
    completedJobEvent.action = `completed`;
    const event = await createSignedEvent(
      completedJobEvent,
      'workflow_job',
      secret
    );

    const reponse = await processEvent(event.headers, JSON.parse(event.body));
    expect(sqsMock).toHaveReceivedCommandTimes(SendMessageCommand, 0);
    expect(reponse.statusCode).toBe(201);
  });

  it('Rejects Unsupported Event Types', async () => {
    const event = await createSignedEvent({}, 'push', secret);

    const reponse = await processEvent(event.headers, JSON.parse(event.body));
    expect(reponse.statusCode).toBe(422);
  });

  it('Rejects Events Signed With The Wrong Secret', async () => {
    const event = await createSignedEvent(
      workflowjob_event,
      'workflow_job',
      'invalidsecret'
    );
    const reponse = await processEvent(event.headers, JSON.parse(event.body));
    expect(reponse.statusCode).toBe(401);
  });

  it('Rejects Events With No Signature', async () => {
    const event = mock<APIGatewayEvent>();
    event.body = JSON.stringify(workflowjob_event);
    event.headers['x-github-event'] = 'workflow_job';

    const reponse = await processEvent(event.headers, JSON.parse(event.body));
    expect(reponse.statusCode).toBe(401);
  });

  it('Should Fail if Message is unable to be queued', async () => {
    sqsMock.reset();
    sqsMock.on(SendMessageCommand).rejects({});
    const event = await createSignedEvent(
      workflowjob_event,
      'workflow_job',
      secret
    );

    const reponse = await processEvent(event.headers, JSON.parse(event.body));
    expect(ssmMock).toHaveReceivedCommandTimes(GetParameterCommand, 1);
    expect(sqsMock).toHaveReceivedCommandTimes(SendMessageCommand, 1);
    expect(reponse.statusCode).toBe(500);
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
