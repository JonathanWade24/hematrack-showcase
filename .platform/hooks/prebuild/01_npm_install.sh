#!/bin/bash
cd /var/app/staging

# Install all dependencies including dev dependencies
npm ci --include=dev

# Log completion
echo "NPM dependencies installed including development dependencies" 