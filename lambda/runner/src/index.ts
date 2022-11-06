import { Logger } from '@aws-lambda-powertools/logger';
import { SSM } from '@aws-sdk/client-ssm';
import { SQSBatchItemFailure, SQSBatchResponse, SQSEvent } from 'aws-lambda';
import { randomUUID } from 'crypto';
import config from './config';
import { getMatchingTaskDefinition, RunnerConfig, startRunner } from './ecs';
import { createRunnerToken } from './registration';
import { SSMCache } from './ssm';

const logger = new Logger({ serviceName: 'gitHubRunner' });
const client = new SSM({ region: process.env.AWS_REGION });
const secretCache = new SSMCache(client, config.secretTtl); //TODO: RENAME

export const handler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
  let messageId = '';
  const batchItemFailures: SQSBatchItemFailure[] = [];

  if (event.Records.length < 1) {
    return { batchItemFailures: [] };
  }

  logger.info('Received Request');

  // In theory we could batch creation of the runners however we would lose flexibility on tagging
  // All launched tasks would share the same tags
  for (const message of event.Records) {
    try {
      //process message
      messageId = message.messageId;
      logger.info(`Processing message with id: ${messageId}`);
      const payload = JSON.parse(message.body);
      const taskDefintionArn = await getMatchingTaskDefinition(
        config.ecsFamilyPrefix,
        payload.labels
      );
      logger.info(`Found Task Definition: ${taskDefintionArn}`);
      logger.warn(`payload: ${payload}`);
      // Grab GH Cert generate registration token and create Runner
      const ghCert = await secretCache.getSecretValue(config.ghAppKeyPath);
      logger.warn(`scrt: ${ghCert}`);
      const token = await createRunnerToken(
        ghCert,
        config.useOrgRunner,
        payload
      );
      logger.info(`token is: ${token}`);

      const tokenPath = '/gh_actions/token/' + randomUUID();
      await secretCache.putSecureKey(
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

      await startRunner(taskDefintionArn, runnerConfig);
    } catch (err) {
      //Add failures to list to return
      logger.warn('Failed to process message: ${messageId}', err);
      batchItemFailures.push({ itemIdentifier: messageId });
    }
  }
  return {
    batchItemFailures: batchItemFailures,
  };
};
