import { SQSBatchItemFailure, SQSBatchResponse, SQSEvent } from 'aws-lambda';

export const handler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
  let messageId = '';
  const batchItemFailures: SQSBatchItemFailure[] = [];

  if (event.Records.length < 1) {
    return { batchItemFailures: [] };
  }

  for (const message of event.Records) {
    try {
      //process message
      messageId = message.messageId;
    } catch (err) {
      //Add failures to list to return
      batchItemFailures.push({ itemIdentifier: messageId });
    }
  }
  return {
    batchItemFailures: batchItemFailures,
  };
};
