const secretTtl = parseInt(process.env.SECRET_TTL || '');

const config = {
  // Secret Config
  secretTtl: Number.isInteger(secretTtl) ? secretTtl : 0,
  ssmkey: process.env.SECRET_PATH || '',

  //SQS config
  sqsUrl: process.env.SQS_URL || '',
};

export default config;
