import { SSM } from '@aws-sdk/client-ssm';
import { Webhooks } from '@octokit/webhooks';
import { WorkflowJobEvent } from '@octokit/webhooks-types';
import { logger } from '../logger';
import { ActionRequestMessage, sendActionRequest } from '../sqs/client';
import { CachingSSMClient } from '../ssm/client';
import config from './config';

const client = new SSM({ region: process.env.AWS_REGION });
const secretCache = new CachingSSMClient(client, config.secretTtl);

const supportedEvents = ['workflow_job']; //TODO: Checkrun?

export interface Response {
  statusCode: number;
  body: string;
}

export const processEvent = async (
  headers: { [name: string]: string },
  event: WorkflowJobEvent
): Promise<Response> => {
  // Validate webhook config
  if (!validateConfig()) {
    logger.error('Webhook Lambda is misconfigured');
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Webhook configuration error',
      }),
    };
  }

  // convert all header keys to lowercase as GH uses mixed cases
  for (const key in headers) {
    headers[key.toLowerCase()] = headers[key];
  }

  if (!event) {
    logger.error('Bad Request. Body is missing');
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: 'Bad Request. Body is missing',
      }),
    };
  }

  // Fetch secret Key from SSM and configure validator
  const secret = await secretCache.getSecretValue(config.ssmkey);
  const webhooks = new Webhooks({
    secret: secret,
  });

  // Check request is signed with correct secret
  const signature = headers['x-hub-signature-256'];
  if (!signature || !(await webhooks.verify(event, signature))) {
    logger.error(
      'Unauthorized. Missing or invalid signature. Check the webhook secret is configured correctly.'
    );
    return {
      statusCode: 401,
      body: JSON.stringify({
        message: 'Unauthorized. Invalid signature',
      }),
    };
  }

  // Check webhook is supported
  const eventName = headers['x-github-event'];

  if (!eventName || !supportedEvents.includes(eventName)) {
    logger.warn(`Unsupported Event: '${eventName}'`);

    return {
      statusCode: 422,
      body: JSON.stringify({
        message: 'Event Type is Unsupported',
      }),
    };
  }

  // Ignore unless the job is being created + queued
  if (event.action !== 'queued') {
    logger.debug(`Ignoring Event Action: ${event.action}`);

    return {
      statusCode: 201,
      body: '',
    };
  }

  const actionMessage: ActionRequestMessage = {
    id: event.workflow_job.id,
    eventType: eventName,
    repositoryName: event.repository.name,
    repositoryOwner: event.repository.owner.login,
    installationId: event.installation?.id || 0,
    labels: event.workflow_job.labels || [],
  };

  logger.info(`Posting Message: ${JSON.stringify(actionMessage)}`);

  try {
    await sendActionRequest(actionMessage);
    logger.info(`Successfully queued job for: ${event.repository.full_name}`);
  } catch (err) {
    logger.error(`Failed to queue job for: ${event.repository.full_name}`, err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Failed to queue job',
      }),
    };
  }

  // Success
  return {
    statusCode: 200,
    body: '',
  };
};

function validateConfig() {
  logger.debug(`Validating config ${JSON.stringify(config, null, 2)}`);
  let valid = true;

  if (!config.ssmkey) {
    valid = false;
    logger.error('Secret Key SSM Path has not been configured');
  }

  try {
    new URL(config.sqsUrl);
  } catch (error) {
    valid = false;
    logger.error(`The SQS URL: ${config.sqsUrl} is not a valid URL`, {
      exception: error.message,
    });
  }
  return valid;
}
