import { ActionRequestMessage, createRunnerToken } from '.';

const token = 'xxx';
describe('Auth tests', () => {
  it('should work', async () => {
    const request: ActionRequestMessage = {
      id: 123,
      eventType: 'workflow_job',
      repositoryOwner: 'james-bjss',
      repositoryName: 'gh-webhook-test',
      installationId: 123,
      labels: ['self-hosted', 'linux', 'x86'],
    };
    await createRunnerToken(token, false, request);
  });
});
