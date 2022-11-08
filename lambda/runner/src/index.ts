import { SSM } from '@aws-sdk/client-ssm';
import { SQSBatchItemFailure, SQSBatchResponse, SQSEvent } from 'aws-lambda';
import { randomUUID } from 'crypto';
import config from './config';
import { getMatchingTaskDefinition, RunnerConfig, startRunner } from './ecs';
import { logger } from './logger';
import { createRunnerToken } from './registration';
import { CachingSSMClient } from './ssm/client';

const client = new SSM({ region: process.env.AWS_REGION });
const ssmClient = new CachingSSMClient(client, config.secretTtl); //TODO: RENAME

export const handler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
  logger.debug(JSON.stringify(event));
  let result: SQSBatchResponse;
  try {
    result = await processEvent(event);
  } catch (err) {
    logger.error('Failed to process Runner:', err);
    result = { batchItemFailures: [] };
  }

  return result;
};

export const processEvent = async (
  event: SQSEvent
): Promise<SQSBatchResponse> => {
  let messageId = '';
  const batchItemFailures: SQSBatchItemFailure[] = [];

  // Should never happen
  if (event.Records.length < 1) {
    logger.debug('Received event.records has 0 records');
    return { batchItemFailures: [] };
  }

  logger.info('Received request');

  // In theory we could batch creation of the runners however we would lose flexibility on tagging
  // All launched tasks would share the same tags
  for (const message of event.Records) {
    try {
      messageId = message.messageId;
      logger.info(`Processing message with id: ${messageId}`);
      const payload = JSON.parse(message.body);
      logger.debug(`payload: ${message.body}`);

      const taskDefinitionArn = await getMatchingTaskDefinition(
        config.ecsFamilyPrefix,
        payload.labels
      );

      if (!taskDefinitionArn) {
        throw new Error('No matching task definition found');
      }

      logger.info(`Found task definition: ${taskDefinitionArn}`);

      // Grab GH Cert generate registration token and create Runner
      const ghCert = await ssmClient.getSecretValue(config.ghAppKeyPath);
      const token = await createRunnerToken(
        ghCert,
        config.useOrgRunner,
        payload
      );
      logger.info(`token is: ${token}`);

      const tokenPath = `${config.runnerSSMTokenPath}${randomUUID()}`;
      await ssmClient.putSecureKey(
        tokenPath,
        token,
        `Registration token for runner`
      );

      const runnerConfig: RunnerConfig = {
        tokenPath: tokenPath,
        allowAutomaticUpdates: false,
        organization: payload.repositoryOwner,
        labels: payload.labels,
        isOrgRunner: config.useOrgRunner,
        repositoryName: payload.repositoryName,
      };

      await startRunner(taskDefinitionArn, runnerConfig);
    } catch (err) {
      //Add failures to list to return
      logger.warn(`Failed to process message: ${messageId}`, err);
      batchItemFailures.push({ itemIdentifier: messageId });
    }
  }

  return {
    batchItemFailures: batchItemFailures,
  };
};
