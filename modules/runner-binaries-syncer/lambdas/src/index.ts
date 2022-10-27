import { Octokit } from '@octokit/rest';

async function getlatestRelease(runnerOs = 'linux', runnerArch = 'x64') {
  const githubClient = new Octokit();
  const latestRelease = await githubClient.repos.getLatestRelease({
    owner: 'actions',
    repo: 'runner',
  });
  console.log(latestRelease.data.tag_name.replace(/^v/, ''));

  if (!latestRelease || !latestRelease.data) {
    return undefined;
  }

  const releaseVersion = latestRelease.data.tag_name.replace(/^v/, '');
  const assets = latestRelease.data.assets?.filter((a: { name?: string }) =>
    a.name?.includes(
      `actions-runner-${runnerOs}-${runnerArch}-${releaseVersion}.`
    )
  );

  console.log(assets[0].browser_download_url);
}

getlatestRelease();
