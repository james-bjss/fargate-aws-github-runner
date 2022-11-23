import { SSMClient } from '@aws-sdk/client-ssm';
import { SQSBatchItemFailure, SQSBatchResponse, SQSEvent } from 'aws-lambda';
import { randomUUID } from 'crypto';
import {
  getMatchingTaskDefinition,
  RunnerConfig,
  startRunner,
} from '../ecs/client';
import { createRunnerToken } from '../github/client';
import { logger } from '../logger';
import CachingSSMClient from '../ssm/client';
import config from './config';

const client = new SSMClient({ region: process.env.AWS_REGION });
const ssmClient = new CachingSSMClient(client, config.secretTtl);

export const processEvent = async (
  event: SQSEvent
): Promise<SQSBatchResponse> => {
  let messageId = '';
  const batchItemFailures: SQSBatchItemFailure[] = [];

  // Should never happen
  if (event.Records.length < 1) {
    logger.warn('Received event.records has 0 records');
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
      const appId = parseInt(
        await ssmClient.getSecretValue(config.ghAppIdKeyPath)
      );
      const token = await createRunnerToken(
        ghCert,
        appId,
        config.useOrgRunner,
        payload
      );

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
