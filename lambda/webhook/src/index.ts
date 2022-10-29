import { Logger } from '@aws-lambda-powertools/logger';
import { SSM } from '@aws-sdk/client-ssm';
import { SSMCache } from './ssm/cache';
import { Webhooks } from '@octokit/webhooks';
import { APIGatewayEvent, APIGatewayProxyResult } from 'aws-lambda';

const logger = new Logger({ serviceName: 'gitHubWebHook' });
const client = new SSM({ region: process.env.AWS_REGION });
const secretCache = new SSMCache(client);

const supportedEvents = ['check_run', 'workflow_job'];
const secretKey = '/gh_action/webhook_secret';

export const handler = async (
  event: APIGatewayEvent
): Promise<APIGatewayProxyResult> => {
  const signature = event.headers['x-hub-signature-256'];

  if (!event.body) {
    logger.warn('Bad Request. Body is missing');
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: 'Bad Request. Body is missing',
      }),
    };
  }

  // Fetch secret Key from SSM and configure validator
  const secret = await secretCache.getSecretValue(secretKey);
  const webhooks = new Webhooks({
    secret: secret,
  });

  // Check request is signed with correct secret
  if (!signature || !(await webhooks.verify(event.body, signature))) {
    logger.warn(
      'Unauthorized. Missing Signature. Check the webhook secret is configured correctly.'
    );
    return {
      statusCode: 401,
      body: JSON.stringify({
        message: 'Unauthorized. Invalid Signature',
      }),
    };
  }

  // Check webhook is supported
  const eventName = event.headers['x-github-event'];

  if (!eventName || !supportedEvents.includes(eventName)) {
    logger.warn(`Unsupported Event: '${eventName}'`);

    return {
      statusCode: 422,
      body: JSON.stringify({
        message: 'Event Type is Unsupported',
      }),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: JSON.stringify(event.body),
    }),
  };
};
