const secretTtl = parseInt(process.env.SECRET_TTL || '');

const config = {
  // ECS Runner Config
  ecsCluster: process.env.ECS_CLUSTER || '',
  ecsSubnets: (process.env.ECS_SUBNETS || '').replace(' ', '').split(','),
  ecsSecurityGroups: (process.env.ECS_SECURITY_GROUPS || '')
    .replace(' ', '')
    .split(','),
  ecsFamilyPrefix: process.env.ECS_FAMILY_PREFIX || '',
  ecsLabelsKey: 'GH:labels',

  // SSM config
  secretTtl: Number.isInteger(secretTtl) ? secretTtl : 0,
  runnerSSMTokenPath: '/gh_actions/token/',

  // GH App config
  ghAppId: parseInt(process.env.GH_APP_ID || ''),
  ghAppKeyPath: process.env.GH_APP_KEY_PATH || '',
  useOrgRunner: process.env.USE_ORG_RUNNERS?.toLowerCase() == 'true',
};

export default config;