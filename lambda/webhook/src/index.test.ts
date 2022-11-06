import { APIGatewayEvent, Context } from 'aws-lambda';
import { mocked } from 'jest-mock';
import { mock } from 'jest-mock-extended';
import { handler } from '.';
import workflowjob_event from '../test/resources/workflowjob_event.json';
import { processEvent } from './webhook/webhook';

// Mock handler
jest.mock('./webhook/webhook');

describe('Test Webhook Handler Wrapper', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('Message Is Processed Successfully', async () => {
    const mockWebhook = mocked(processEvent);
    mockWebhook.mockImplementation(() => {
      return new Promise((resolve) => {
        resolve({ statusCode: 200, body: '{}' });
      });
    });
    const event = mock<APIGatewayEvent>();
    event.body = JSON.stringify(workflowjob_event);
    const context = mock<Context>();

    const result = await handler(event, context);
    expect(result).toEqual({ statusCode: 200, body: '{}' });
  });

  it('Returns Handled Errors', async () => {
    const mockWebhook = mocked(processEvent);
    mockWebhook.mockImplementation(() => {
      return new Promise((resolve) => {
        resolve({ statusCode: 401, body: '{}' });
      });
    });
    const event = mock<APIGatewayEvent>();
    event.body = JSON.stringify(workflowjob_event);
    const context = mock<Context>();

    const result = await handler(event, context);
    expect(result).toEqual({ statusCode: 401, body: '{}' });
  });

  it('Handles Errors', async () => {
    const mockWebhook = mocked(processEvent);
    mockWebhook.mockRejectedValue(new Error('an error'));

    const event = mock<APIGatewayEvent>();
    event.body = JSON.stringify(workflowjob_event);
    const context = mock<Context>();

    const result = await handler(event, context);
    expect(result).toMatchObject({ statusCode: 500 });
  });
});
