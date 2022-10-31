import {
  ECSClient,
  ListTagsForResourceCommand,
  ListTagsForResourceCommandInput,
  ListTaskDefinitionsCommandInput,
  paginateListTaskDefinitions,
} from '@aws-sdk/client-ecs';
const client = new ECSClient({ region: process.env.AWS_REGION });

export const getMatchingTaskDefinition = async (
  family: string,
  labels: string[]
) => {
  const command: ListTaskDefinitionsCommandInput = {
    familyPrefix: family,
    status: 'ACTIVE',
    sort: 'DESC', // Newest first
  };

  let taskDefinitionArns = [];
  for await (const data of paginateListTaskDefinitions({ client }, command)) {
    const arns: string[] = data.taskDefinitionArns?.map((item) => item) || [];
    taskDefinitionArns = [...taskDefinitionArns, ...arns];
  }

  //Find the first record that matches every label.
  //Need to think about this behaviour - do we want exact matching or have precedence? - Pass a strategy?
  //TODO: Maybe don't do this async because of request throttling?
  taskDefinitionArns.find(async (arn) => {
    const definitionLabels = await getLabelsforTaskDefinition(arn);
    return definitionLabels.every((label) => labels.includes(label));
  });

  return taskDefinitionArns;
};

async function getLabelsforTaskDefinition(
  definitionArn: string
): Promise<string[]> {
  const command: ListTagsForResourceCommandInput = {
    resourceArn: definitionArn,
  };
  const response = await client.send(new ListTagsForResourceCommand(command));
  const tags = response.tags.find((tag) => tag.key === 'GH:labels').value;
  return tags.split(',');
}
