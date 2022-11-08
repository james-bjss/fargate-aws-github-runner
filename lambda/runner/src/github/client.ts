import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from '@octokit/rest';
import config from '../runner/config';

export const createRunnerToken = async (
  cert: string,
  isOrgInstallation: boolean,
  request: ActionRequestMessage
) => {
  const installationId = await getAppInstallationId(
    cert,
    isOrgInstallation,
    request
  );
  const oktoKit = await getAppClient(cert, installationId);

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
  isOrgInstallation: boolean,
  request: ActionRequestMessage
) => {
  const oktoKit = await getAppClient(cert);

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
  installationId: number | undefined = undefined
) => {
  const buffer = Buffer.from(cert, 'base64');
  const privateKey = buffer.toString();

  const authConfig = {
    appId: config.ghAppId,
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
