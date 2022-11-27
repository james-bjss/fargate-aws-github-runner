import { APIGatewayEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { logger } from './logger';
import { processEvent, Response } from './webhook/webhook';

export const handler = async (
  event: APIGatewayEvent,
  _context: Context
): Promise<APIGatewayProxyResult> => {
  logger.debug(JSON.stringify(event));
  let result: Response;
  try {
    result = await processEvent(event.headers, JSON.parse(event.body));
  } catch (err) {
    logger.error('Failed to process Webhook:', err);
    result = {
      statusCode: 500,
      body: 'Failed to Process Webhook. Check logs for details',
    };
  }
  return result;
};
