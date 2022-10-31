import {
  ECSClient,
  ListTagsForResourceCommand,
  ListTaskDefinitionsCommand,
} from '@aws-sdk/client-ecs';
import { mockClient } from 'aws-sdk-client-mock';
import { getMatchingTaskDefinition } from '.';

const ecsMock = mockClient(ECSClient);

describe('ECS', () => {
  beforeEach(() => {
    ecsMock.reset();
    // Mock SSM
    ecsMock
      .on(ListTaskDefinitionsCommand, { familyPrefix: 'blah' })
      .resolves({
        taskDefinitionArns: [
          'arn:aws:ecs:us-east-1:012345678910:task-definition/gh_linux:1',
          'arn:aws:ecs:us-east-1:012345678910:task-definition/gh_linux:2',
          'arn:aws:ecs:us-east-1:012345678910:task-definition/gh_linux:3',
          'arn:aws:ecs:us-east-1:012345678910:task-definition/gh_linux:4',
        ],
      })
      .on(ListTagsForResourceCommand, {})
      .resolves({
        tags: [
          {
            key: 'GH:labels',
            value: 'linux,x86',
          },
        ],
      });

    jest.resetModules();
  });
  it('Should Match Family and Labels', async () => {
    const definition = await getMatchingTaskDefinition('blah', [
      'linux',
      'x86',
    ]);
    console.log(definition);
  });
});
