#!/usr/bin/env bash      
set -e

###################################################################
#Script Name	: installRunner.sh                                                                                              
#Description	: This script downloads and extracts the latest GH Runner release.                                                                                                                                                                  
#Author       	: James Bennett                                      
###################################################################

# Determine correct architecture for the artifact
case $(uname -m) in
x86_64)  ARCH="x64" ;;
i*86)    ARCH="x86" ;;
aarch64) ARCH="arm64" ;;
*)
   echo "Unsupported Architecture"
   exit 1
    ;;
esac

OS="linux"

# Determine latest runner release and download
RESPONSE_JSON=$(curl -s -f https://api.github.com/repos/actions/runner/releases/latest)
LATEST_TAG=$(echo $RESPONSE_JSON | jq -r .tag_name | sed s/^v//)
ASSET_NAME="actions-runner-$OS-$ARCH-$LATEST_TAG.tar.gz"
DOWNLOAD_URL=$(echo $RESPONSE_JSON | jq -r --arg ASSET "$ASSET_NAME" '.assets[] | select(.name|test($ASSET)) | .browser_download_url')

echo "Found Latest Tag: ${LATEST_TAG}"
echo "Downloading from URL: ${DOWNLOAD_URL}"

pushd .
mkdir -p actions-runner && cd actions-runner
curl -f -L "$DOWNLOAD_URL" -o actions-runner.tar.gz
tar xzf ./actions-runner.tar.gz
rm ./actions-runner.tar.gz
popd

echo "Install Complete"