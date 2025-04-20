#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# Define variables (easier to modify if needed)
AWS_PROFILE="Administrator-557690625517"
AWS_REGION="us-east-1"
BOOTSTRAP_PARAM_NAME="/cdk-bootstrap/hnb659fds/version"
BOOTSTRAP_VERSION="27" # The version number we determined

echo "Attempting to set bootstrap parameter and deploy..."

# 1. Write the plain text bootstrap version to SSM
aws ssm put-parameter --name "$BOOTSTRAP_PARAM_NAME" --value "$BOOTSTRAP_VERSION" --type String --overwrite --region "$AWS_REGION" --profile "$AWS_PROFILE"

# Check if put-parameter succeeded (basic check, aws cli doesn't have reliable exit code here sometimes)
if [ $? -ne 0 ]; then
  echo "ERROR: Failed to put SSM parameter. Exiting."
  exit 1
fi
echo "SSM parameter updated successfully."

# 2. Ensure we are in the correct directory (script should be run from infrastructure_backend)
# cd "$(dirname "$0")" # Better: Assume script is run from infrastructure_backend directly

# 3. Deploy the CDK stack
echo "Running cdk deploy..."
cdk deploy --profile "$AWS_PROFILE"

echo "Deployment script finished." 