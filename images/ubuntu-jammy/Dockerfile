FROM ubuntu:20.04

# set the github runner version
ARG RUNNER_VERSION="2.298.2"

# update the base packages and add a non-sudo user
RUN apt-get update -y && apt-get upgrade -y && useradd -m github

RUN export TZ=Europe/London
# install python and the packages the your code depends on along with jq so we can parse JSON
# add additional packages as necessary
RUN DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    curl jq ca-certificates libssl-dev libffi-dev tzdata unzip awscli

# cd into the user directory, download and unzip the github actions runner
RUN cd /home/github && mkdir actions-runner && cd actions-runner \
    && curl -O -L https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz \
    && tar xzf ./actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz \
    && rm ./actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz

# Install the dependencies needed by the runner
RUN chown -R github ~github && /home/github/actions-runner/bin/installdependencies.sh

# Add getToken Script
COPY getToken/ getToken/

COPY entrypoint.sh entrypoint.sh
RUN chmod +x entrypoint.sh

# # since the config and run script for actions are not allowed to be run by root,
# # set the user to "github" so all subsequent commands are run as the github user
USER github

# set the entrypoint to the entrypoint.sh script
ENTRYPOINT ["./entrypoint.sh"]
