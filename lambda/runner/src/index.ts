import { SQSBatchItemFailure, SQSBatchResponse, SQSEvent } from 'aws-lambda';
import config from './config';
import { getMatchingTaskDefinition } from './ecs';

export const handler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
  let messageId = '';
  const batchItemFailures: SQSBatchItemFailure[] = [];

  if (event.Records.length < 1) {
    return { batchItemFailures: [] };
  }

  // In theory we could batch creation of the runners however we would lose flexibility on tagging
  // All launched tasks would share the same tags
  for (const message of event.Records) {
    try {
      //process message
      messageId = message.messageId;
      const payload = JSON.parse(message.body);
      getMatchingTaskDefinition(config.ecsFamilyPrefix, payload.labels);
    } catch (err) {
      //Add failures to list to return
      batchItemFailures.push({ itemIdentifier: messageId });
    }
  }
  return {
    batchItemFailures: batchItemFailures,
  };
};
