import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { WorkflowJobEvent } from '@octokit/webhooks-types';
import config from '../config';
const sqsClient = new SQSClient({ region: process.env.AWS_REGION });

export interface ActionRequestMessage {
  id: number;
  eventType: string;
  repositoryName: string;
  repositoryOwner: string;
  installationId: number;
  labels: string[];
}
export interface GithubWorkflowEvent {
  workflowJobEvent: WorkflowJobEvent;
}

export const sendActionRequest = async (
  message: ActionRequestMessage
): Promise<void> => {
  const sqsMessage = new SendMessageCommand({
    MessageGroupId: message.id.toString(),
    QueueUrl: config.sqsUrl,
    MessageBody: JSON.stringify(message),
    MessageDeduplicationId: message.id.toString(),
  });

  await sqsClient.send(sqsMessage);
};
