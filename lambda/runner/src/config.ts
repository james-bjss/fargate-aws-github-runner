const config = {
  // ECS Runner Config
  ecsCluster: process.env.ECS_CLUSTER || '',
  ecsSubnets: (process.env.ECS_SUBNETS || '').replace(' ', '').split(','),
  ecsSecurityGroups: (process.env.ECS_SECURITY_GROUPS || '')
    .replace(' ', '')
    .split(','),
  ecsFamilyPrefix: process.env.ECS_FAMILY_PREFIX || '',
  ecsLabelsKey: 'GH:labels',
};

export default config;
