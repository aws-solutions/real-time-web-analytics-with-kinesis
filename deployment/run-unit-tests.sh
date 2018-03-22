#!/bin/bash

# This script should be run from the repo's deployment directory
# cd deployment
# ./run-unit-tests.sh

export initial_dir=`pwd`

# Run unit tests
echo "Running unit tests"
echo "cd ../source"
cd "./source/custom-resource"
npm test

cd "$initial_dir"

echo "Completed unit tests"
