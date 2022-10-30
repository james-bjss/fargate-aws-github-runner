import { Logger } from '@aws-lambda-powertools/logger';
import { SSM } from '@aws-sdk/client-ssm';
import { Webhooks } from '@octokit/webhooks';
import { WorkflowJobEvent } from '@octokit/webhooks-types';
import { APIGatewayEvent, APIGatewayProxyResult } from 'aws-lambda';
import config from './config';
import { ActionRequestMessage, sendActionRequest } from './sqs';
import { SSMCache } from './ssm/cache';

const logger = new Logger({ serviceName: 'gitHubWebHook' });
const client = new SSM({ region: process.env.AWS_REGION });
const secretCache = new SSMCache(client, config.secretTtl);

const supportedEvents = ['check_run', 'workflow_job'];

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
  const secret = await secretCache.getSecretValue(config.ssmkey);
  const webhooks = new Webhooks({
    secret: secret,
  });

  // Check request is signed with correct secret
  if (!signature || !(await webhooks.verify(event.body, signature))) {
    logger.warn(
      'Unauthorized. Missing Or Invalid Signature. Check the webhook secret is configured correctly.'
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

  const workflowEvent: WorkflowJobEvent = JSON.parse(event.body);

  // Ignore unless the job is being queued
  logger.debug(`Ignoring Event Action`);
  if (workflowEvent.action !== 'queued') {
    return {
      statusCode: 201,
      body: '',
    };
  }

  const actionMessage: ActionRequestMessage = {
    id: workflowEvent.workflow_job.id,
    eventType: event.headers['x-github-event'],
    repositoryName: workflowEvent.repository.name,
    repositoryOwner: workflowEvent.repository.owner.name,
    installationId: workflowEvent.installation?.id || -1,
    labels: workflowEvent.workflow_job.labels || [],
  };

  try {
    await sendActionRequest(actionMessage);
    logger.info(
      `Successfully queued job for: ${workflowEvent.repository.full_name}`
    );
  } catch (err) {
    logger.error(
      `Failed to queue job for: ${workflowEvent.repository.full_name}`,
      err
    );
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
