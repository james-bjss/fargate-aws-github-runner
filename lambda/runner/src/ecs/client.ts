import {
  ECSClient,
  ListTagsForResourceCommand,
  ListTagsForResourceCommandInput,
  ListTaskDefinitionFamiliesCommandInput,
  ListTaskDefinitionsCommandInput,
  paginateListTaskDefinitionFamilies,
  paginateListTaskDefinitions,
  RunTaskCommand,
  RunTaskCommandInput,
} from '@aws-sdk/client-ecs';
import { logger } from '../logger';
import config from '../runner/config';

const client = new ECSClient({ region: process.env.AWS_REGION });

export const getMatchingTaskDefinition = async (
  familyPrefix: string,
  labels: string[]
): Promise<string> => {
  const command: ListTaskDefinitionFamiliesCommandInput = {
    familyPrefix: familyPrefix,
  };

  let families: string[] = [];
  for await (const data of paginateListTaskDefinitionFamilies(
    { client },
    command
  )) {
    if (data?.families && data.families.length > 0) {
      families = [...families, ...data.families];
    }
  }

  for (const family of families) {
    const matchedArn = await getMatchingTaskDefinitionForFamily(family, labels);
    if (matchedArn) {
      return matchedArn;
    }
  }

  return null;
};

export const getMatchingTaskDefinitionForFamily = async (
  family: string,
  labels: string[]
): Promise<string | undefined> => {
  const command: ListTaskDefinitionsCommandInput = {
    familyPrefix: family,
    status: 'ACTIVE',
    sort: 'DESC', // Newest first
  };

  let taskDefinitionArns = [];
  for await (const data of paginateListTaskDefinitions({ client }, command)) {
    const arns: string[] = data.taskDefinitionArns || [];
    taskDefinitionArns = [...taskDefinitionArns, ...arns];
  }

  logger.info(`Found Tasks defs for family "${family}": ${taskDefinitionArns}`);

  //Find the first record that matches every label.
  //Need to think about this behaviour - do we want exact matching or have precedence? - Pass a strategy?
  //TODO: Maybe don't do this async because of request throttling?
  const matchedArn = taskDefinitionArns.find(async (arn) => {
    const definitionLabels = await getLabelsforTaskDefinition(arn);
    return definitionLabels.every((label) => labels.includes(label));
  });

  return matchedArn;
};

export const startRunner = async (
  taskDefinitionArn: string,
  runnerConfig: RunnerConfig
): Promise<void> => {
  const command: RunTaskCommandInput = {
    taskDefinition: taskDefinitionArn,
    cluster: config.ecsCluster,
    count: 1,
    enableECSManagedTags: true,
    networkConfiguration: {
      awsvpcConfiguration: {
        assignPublicIp: 'DISABLED',
        securityGroups: config.ecsSecurityGroups,
        subnets: config.ecsSubnets,
      },
    },
    overrides: {
      containerOverrides: [
        {
          name: 'runner', //TODO: Add to config
          environment: [
            {
              name: 'RUNNER_TOKEN_PATH',
              value: runnerConfig.tokenPath,
            },
            {
              name: 'ORGANIZATION',
              value: runnerConfig.organization,
            },
            {
              name: 'REPO',
              value: runnerConfig.repositoryName,
            },
            {
              name: 'LABELS',
              value: runnerConfig.labels.join(','),
            },
            {
              name: 'USE_ORG',
              value: runnerConfig.isOrgRunner ? 'true' : 'false',
            },
          ],
        },
      ],
    },
  };

  await client.send(new RunTaskCommand(command));
};

async function getLabelsforTaskDefinition(
  definitionArn: string
): Promise<string[]> {
  const input: ListTagsForResourceCommandInput = {
    resourceArn: definitionArn,
  };
  const response = await client.send(new ListTagsForResourceCommand(input));
  const tags = response.tags.find(
    (tag) => tag.key === config.ecsLabelsKey
  ).value;
  return tags.split(' ');
}

export type RunnerConfig = {
  tokenPath: string;
  organization: string;
  isOrgRunner: boolean;
  repositoryName: string;
  allowAutomaticUpdates: boolean;
  labels: string[];
};
