#!/bin/bash

# This script deploys the Docker container to an EC2 instance

# Set environment variables
SUPABASE_URL="https://wivmthxpusoufivahijg.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indpdm10aHhwdXNvdWZpdmFoaWpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDgzNTc3ODcsImV4cCI6MjAyMzkzMzc4N30.pHJfbMwl6u8p9JpJ6mNJOQXVVtZTu4XN-vDFnGXZW6w"
EC2_IP="your-ec2-ip"
SSH_KEY_PATH="~/path-to-your-ssh-key.pem"

# Save the Docker image
echo "Saving Docker image..."
docker save scd-dashboard:latest -o scd-dashboard.tar

# Transfer to EC2
echo "Transferring Docker image to EC2..."
scp -i $SSH_KEY_PATH scd-dashboard.tar ec2-user@$EC2_IP:~/

# SSH to EC2 and load the image
echo "Loading Docker image on EC2..."
ssh -i $SSH_KEY_PATH ec2-user@$EC2_IP << 'EOF'
  sudo docker load -i ~/scd-dashboard.tar
  sudo docker stop scd-app || true
  sudo docker rm scd-app || true
  sudo docker run -d --name scd-app -p 80:3000 \
    -e NODE_ENV=production \
    -e NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL \
    -e NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY \
    scd-dashboard:latest
  rm ~/scd-dashboard.tar
EOF

echo "Deployment complete!"
echo "Your application should be running at http://$EC2_IP" 