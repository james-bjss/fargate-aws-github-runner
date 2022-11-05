#!/bin/sh

echo 'Configuring Self Hosted Runner'

if [ -z "${RUNNER_TOKEN_PATH}" ]; then
  echo 1>&2 "error: missing RUNNER_TOKEN_PATH variable"
  exit 1
fi

if [ -z "${ORGANIZATION}" ]; then
  echo 1>&2 "error: missing ORGANIZATION variable"
  exit 1
fi

ACCESS_TOKEN=$(aws ssm get-parameter --name $RUNNER_TOKEN_PATH --with-decryption --output text --query Parameter.Value)

if [ -z "${ACCESS_TOKEN}" ]; then
  echo 1>&2 "error: missing ACCESS_TOKEN variable"
  exit 1
fi

if [ -z "${LABELS}" ]; then
  echo 1>&2 "error: missing LABELS variable"
  exit 1
fi

# if [ -z "${ENVIRONMENT}" ]; then
#   echo 1>&2 "error: missing AWS_ENVIRONMENT variable"
#   exit 1
# fi

cd /home/github/actions-runner

# export RUNNER_ALLOW_RUNASROOT="1"
# ./config.sh --url https://github.com/${ORGANIZATION} --token ${ACCESS_TOKEN} --unattended --ephemeral --runnergroup self-hosted-${AWS_ENVIRONMENT} --labels ${AWS_ENVIRONMENT}
./config.sh --url https://github.com/${ORGANIZATION} --token ${ACCESS_TOKEN} --unattended --ephemeral --labels ${LABELS}

cleanup() {
    echo "Removing runner..."
    ./config.sh remove --token ${ACCESS_TOKEN}
}

trap 'cleanup; exit 130' INT
trap 'cleanup; exit 143' TERM

./run.sh & wait $!