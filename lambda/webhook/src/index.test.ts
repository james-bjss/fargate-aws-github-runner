import { mockClient } from 'aws-sdk-client-mock';
import * as crypto from 'crypto';
import { GetParameterCommand, SSM } from '@aws-sdk/client-ssm';
import { mock } from 'jest-mock-extended';
import { APIGatewayEvent } from 'aws-lambda';
import { handler } from '.';
import { Webhooks } from '@octokit/webhooks';

const ssmMock = mockClient(SSM);
// Random Key for Testing
const secret = crypto.randomBytes(32).toString('hex');
const webhooks = new Webhooks({
  secret: secret,
});

describe('Webhook', () => {
  beforeEach(() => {
    ssmMock.reset();
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
    jest.resetModules();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('Handler Test', async () => {
    const event = mock<APIGatewayEvent>();
    event.body = '{}';
    event.headers['x-github-event'] = 'workflow_job';
    event.headers['x-hub-signature-256'] = await webhooks.sign(
      event.body || ''
    );

    const reponse = await handler(event);
    expect(reponse.statusCode).toBe(200);
  });

  it('Rejects Unsupported Event Types', async () => {
    const event = mock<APIGatewayEvent>();
    event.body = '{}';
    event.headers['x-github-event'] = 'push';
    event.headers['x-hub-signature-256'] = await webhooks.sign(
      event.body || ''
    );
    const reponse = await handler(event);
    expect(reponse.statusCode).toBe(422);
  });

  it('Rejects Events Signed With The Wrong Secret', async () => {
    const invalidWebhooks = new Webhooks({
      secret: 'invalidsecret',
    });
    const event = mock<APIGatewayEvent>();
    event.body = '{}';
    event.headers['x-github-event'] = 'push';
    event.headers['x-hub-signature-256'] = await invalidWebhooks.sign(
      event.body || ''
    );
    const reponse = await handler(event);
    expect(reponse.statusCode).toBe(401);
  });

  it('Rejects Events With No Signature', async () => {
    const event = mock<APIGatewayEvent>();
    event.body = '{}';
    event.headers['x-github-event'] = 'push';
    const reponse = await handler(event);
    expect(reponse.statusCode).toBe(401);
  });
});
