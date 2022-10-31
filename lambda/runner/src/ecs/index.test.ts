import {
  ECSClient,
  ListTagsForResourceCommand,
  ListTaskDefinitionsCommand,
  ListTaskDefinitionsCommandOutput,
} from '@aws-sdk/client-ecs';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';
import { getMatchingTaskDefinitionForFamily, startRunner } from '.';

const ecsMock = mockClient(ECSClient);

const listTaskDefinitionsResponse: ListTaskDefinitionsCommandOutput = {
  $metadata: null,
  taskDefinitionArns: [
    'arn:aws:ecs:us-east-1:012345678910:task-definition/gh_linux:4',
    'arn:aws:ecs:us-east-1:012345678910:task-definition/gh_linux:3',
    'arn:aws:ecs:us-east-1:012345678910:task-definition/gh_linux:2',
    'arn:aws:ecs:us-east-1:012345678910:task-definition/gh_linux:1',
  ],
};

describe('ECS', () => {
  beforeEach(() => {
    ecsMock.reset();
    // Mock SSM
    ecsMock
      .on(ListTaskDefinitionsCommand)
      .resolves({
        taskDefinitionArns: [],
      })
      .on(ListTaskDefinitionsCommand, { familyPrefix: 'gh_linux' }, false)
      .resolves(listTaskDefinitionsResponse)
      .on(ListTagsForResourceCommand)
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
    const definition = await getMatchingTaskDefinitionForFamily('gh_linux', [
      'linux',
      'x86',
    ]);
    expect(definition).toBe(
      'arn:aws:ecs:us-east-1:012345678910:task-definition/gh_linux:4'
    );
  });

  it('Should Not Match Family', async () => {
    const definition = await getMatchingTaskDefinitionForFamily('gh_nomatch', [
      'linux',
      'x86',
    ]);
    expect(definition).toBeUndefined;
  });

  it('Should Match Family But Not Tags', async () => {
    const definition = await getMatchingTaskDefinitionForFamily('gh_linux', [
      'linux',
      'x86',
      'invalidtag',
    ]);
    expect(definition).toBeUndefined;
  });

  it('Should Not Match Empty Tags', async () => {
    const definition = await getMatchingTaskDefinitionForFamily('gh_linux', [
      'linux',
      'x86',
      'invalidtag',
    ]);
    expect(definition).toBeUndefined;
  });

  it.only('Should Run Task', async () => {
    ecsMock.reset();
    ecsMock.rejects('blah');

    let result;
    try {
      result = await startRunner(
        'arn:aws:ecs:us-east-1:012345678910:task-definition/gh_linux:4'
      );
    } catch (err) {
      console.log({ err });
    } finally {
      await expect(result).rejects.toThrow();
    }
    // expect(ecsMock).toHaveReceivedCommandTimes(RunTaskCommand, 1);
  });
});
