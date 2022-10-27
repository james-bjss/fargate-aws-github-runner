#!/bin/sh

ORGANIZATION=$ORG_GITHUB_NAME
ENVIRONMENT=$AWS_ENVIRONMENT

echo 'Configuring Self Hosted Runner'

if [ -z "${ORGANIZATION}" ]; then
  echo 1>&2 "error: missing ORGANIZATION variable"
  exit 1
fi

if [ -z "${ACCESS_TOKEN}" ]; then
  echo 1>&2 "error: missing ACCESS_TOKEN variable"
  exit 1
fi

if [ -z "${ENVIRONMENT}" ]; then
  echo 1>&2 "error: missing AWS_ENVIRONMENT variable"
  exit 1
fi

cd /home/github/actions-runner

# export RUNNER_ALLOW_RUNASROOT="1"
./config.sh --url https://github.com/${ORGANIZATION} --token ${ACCESS_TOKEN} --unattended --ephemeral --runnergroup self-hosted-${AWS_ENVIRONMENT} --labels ${AWS_ENVIRONMENT}

cleanup() {
    echo "Removing runner..."
    ./config.sh remove --token ${ACCESS_TOKEN}
}

trap 'cleanup; exit 130' INT
trap 'cleanup; exit 143' TERM

./run.sh & wait $!