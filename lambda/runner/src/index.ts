import { Logger } from '@aws-lambda-powertools/logger';
import { SQSBatchItemFailure, SQSBatchResponse, SQSEvent } from 'aws-lambda';
import config from './config';
import { getMatchingTaskDefinition, startRunner } from './ecs';

const logger = new Logger({ serviceName: 'gitHubRunner' });

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
      logger.info(`Found TasksDefinition: ${taskDefintionArn}`);
      await startRunner(taskDefintionArn);
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
