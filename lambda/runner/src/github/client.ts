import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from '@octokit/rest';

export const createRunnerToken = async (
  cert: string,
  appId: number,
  isOrgInstallation: boolean,
  request: ActionRequestMessage
) => {
  const installationId = await getAppInstallationId(
    cert,
    appId,
    isOrgInstallation,
    request
  );
  const oktoKit = await getAppClient(cert, appId, installationId);

  const tokenReponse = isOrgInstallation
    ? await oktoKit.actions.createRegistrationTokenForOrg({
        org: request.repositoryOwner,
      })
    : await oktoKit.actions.createRegistrationTokenForRepo({
        owner: request.repositoryOwner,
        repo: request.repositoryName,
      });
  return tokenReponse.data.token;
};

const getAppInstallationId = async (
  cert: string,
  appId: number,
  isOrgInstallation: boolean,
  request: ActionRequestMessage
) => {
  const oktoKit = await getAppClient(cert, appId);

  return isOrgInstallation
    ? (
        await oktoKit.apps.getOrgInstallation({
          org: request.repositoryOwner,
        })
      ).data.id
    : (
        await oktoKit.apps.getRepoInstallation({
          owner: request.repositoryOwner,
          repo: request.repositoryName,
        })
      ).data.id;
};

const getAppClient = async (
  cert: string,
  appId: number,
  installationId: number | undefined = undefined
) => {
  const buffer = Buffer.from(cert, 'base64');
  const privateKey = buffer.toString();

  const authConfig = {
    appId: appId,
    privateKey: privateKey,
  };

  if (installationId) {
    authConfig['installationId'] = installationId;
  }

  return new Octokit({
    authStrategy: createAppAuth,
    auth: authConfig,
  });
};

export interface ActionRequestMessage {
  id: number;
  eventType: string;
  repositoryName: string;
  repositoryOwner: string;
  installationId: number;
  labels: string[];
}
