import { SQSBatchResponse, SQSEvent } from 'aws-lambda';
import { logger } from './logger';
import { processEvent } from './runner/runner';

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
