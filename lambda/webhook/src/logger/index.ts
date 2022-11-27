import { Logger } from '@aws-lambda-powertools/logger';

const logger = new Logger({
  persistentLogAttributes: {
    aws_account_id: process.env.AWS_ACCOUNT_ID || '',
    aws_region: process.env.AWS_REGION || '',
  },
  serviceName: 'GitHubRunnerWebhook',
});

export { logger };
