import {
  ECSClient,
  ListTagsForResourceCommand,
  ListTaskDefinitionFamiliesCommand,
  ListTaskDefinitionsCommand,
  ListTaskDefinitionsCommandOutput,
  RunTaskCommand,
} from '@aws-sdk/client-ecs';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';
import {
  getMatchingTaskDefinition,
  getMatchingTaskDefinitionForFamily,
  startRunner,
} from '.';

const ecsMock = mockClient(ECSClient);

// Mock lambda config
jest.mock('../config', () => {
  const config = {
    ecsCluster: 'testcluster',
    ecsSubnets: ['sn-1', 'sn-2'],
    ecsSecurityGroups: ['sg-1', 'sg-2'],
    ecsFamilyPrefix: 'gh_',
    ecsLabelsKey: 'GH:labels',
  };

  return {
    __esModule: true,
    config,
    default: config,
  };
});

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
      })
      .on(ListTaskDefinitionFamiliesCommand)
      .resolves({
        families: ['gh_linux'],
        nextToken: null,
      });

    jest.resetModules();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('Should find matching task definitionsfor family prefix', async () => {
    const result = await getMatchingTaskDefinition('gh_', ['linux', 'x86']);
    expect(result).toEqual(listTaskDefinitionsResponse.taskDefinitionArns[0]);
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
    const definition = await getMatchingTaskDefinitionForFamily('gh_linux', []);
    expect(definition).toBeUndefined;
  });

  it('Should Run Task', async () => {
    ecsMock.reset();
    ecsMock.on(RunTaskCommand).resolves({ failures: [] });

    await startRunner(
      'arn:aws:ecs:us-east-1:012345678910:task-definition/gh_linux:4'
    );
    expect(ecsMock).toHaveReceivedCommandTimes(RunTaskCommand, 1);
  });

  it('Should Throw If RunTask Fails', async () => {
    ecsMock.reset();
    ecsMock.on(RunTaskCommand).rejects();

    await expect(
      startRunner(
        'arn:aws:ecs:us-east-1:012345678910:task-definition/gh_linux:4'
      )
    ).rejects.toThrow();
  });
});
