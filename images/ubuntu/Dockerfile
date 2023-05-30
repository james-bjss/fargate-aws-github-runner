FROM --platform=$BUILDPLATFORM ubuntu:20.04
LABEL description="GH Container Agent"

# Set Timezone
ENV TZ=UTC

# Update the base packages and add GH user
RUN apt-get update -y && apt-get upgrade -y && useradd -m github

RUN DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    curl jq ca-certificates libssl-dev libffi-dev tzdata unzip awscli

WORKDIR /home/github/

# Install latest GH runner package
COPY scripts/installRunner.sh .
RUN chmod +x installRunner.sh && ./installRunner.sh


# Install the dependencies needed by the runner
RUN chown -R github ~github && actions-runner/bin/installdependencies.sh

COPY scripts/entrypoint.sh entrypoint.sh
RUN chmod +x entrypoint.sh

USER github

ENTRYPOINT ["./entrypoint.sh"]
