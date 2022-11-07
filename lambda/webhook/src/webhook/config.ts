import { Logger } from '@aws-lambda-powertools/logger';

const secretTtl = parseInt(process.env.SECRET_TTL || '');

const config = {
  // Secret Config
  secretTtl: Number.isInteger(secretTtl) ? secretTtl : 0,
  ssmkey: process.env.SECRET_PATH || '',

  //SQS config
  sqsUrl: process.env.SQS_URL || '',
};

export function validateConfig(logger: Logger) {
  logger.debug(`Validating config ${JSON.stringify(config, null, 2)}`);
  let valid = true;

  if (!config.ssmkey) {
    valid = false;
    logger.error('Secret Key SSM Path has not been configured');
  }

  try {
    new URL(config.sqsUrl);
  } catch (error) {
    valid = false;
    logger.error(`The SQS URL: ${config.sqsUrl} is not a valid URL`, {
      exception: error.message,
    });
  }
  return valid;
}

export default config;
