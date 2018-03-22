#!/bin/bash

# This script should be run from the repo's root directory
# ./deployment/build-s3-dist.sh source-bucket-base-name
# source-bucket-base-name should be the base name for the S3 bucket location where the template will source the Lambda code from.
# The template will append '-[region_name]' to this bucket name.
# For example: ./deployment/build-s3-dist.sh solutions
# The template will then expect the source code to be located in the solutions-[region_name] bucket

# Check to see if input has been provided:
if [ -z "$1" ]; then
    echo "Please provide the base source bucket name where the lambda code will eventually reside.\nFor example: ./build-s3-dist.sh solutions"
    exit 1
fi

# Create `dist` directory
echo "Starting to build distribution"
echo "export initial_dir=`pwd`"
export initial_dir=`pwd`
export deployment_dir="$initial_dir/deployment"
export dist_dir="$initial_dir/deployment/dist"
echo "Clean up $dist_dir"
rm -rf $dist_dir
echo "mkdir -p $dist_dir"
mkdir -p "$dist_dir"

# Copy CFT & swap parameters

# Create templates for new vpc and existing VPC deployments
echo "Inserting new VPC parameters"
awk '/%%PARAMETERS%%/ { system ( "cat '$deployment_dir'/new-vpc-parameters.template" ) } \
     !/%%PARAMETERS%%/ { print; }' $deployment_dir/real-time-web-analytics-with-kinesis.template \
     > $dist_dir/real-time-web-analytics-with-kinesis.template
 echo "Inserting existing VPC parameters"
 awk '/%%PARAMETERS%%/ { system ( "cat '$deployment_dir'/existing-vpc-parameters.template" ) } \
      !/%%PARAMETERS%%/ { print; }' $deployment_dir/real-time-web-analytics-with-kinesis.template \
      > $dist_dir/real-time-web-analytics-with-kinesis-existing-vpc.template
echo "Inserting new VPC resources"
awk '/%%NETWORK_RESOURCES%%/ { system ( "cat '$deployment_dir'/new-vpc-resources.template" ) } \
     !/%%NETWORK_RESOURCES%%/ { print; }' $dist_dir/real-time-web-analytics-with-kinesis.template \
     > $dist_dir/real-time-web-analytics-with-kinesis.template.new
mv $dist_dir/real-time-web-analytics-with-kinesis.template{.new,}
echo "Removing VPC resources placeholder for existing VPCs"
awk '!/%%NETWORK_RESOURCES%%/ { print; }' $dist_dir/real-time-web-analytics-with-kinesis-existing-vpc.template \
     > $dist_dir/real-time-web-analytics-with-kinesis-existing-vpc.template.new
mv $dist_dir/real-time-web-analytics-with-kinesis-existing-vpc.template{.new,}

echo "Updating subnet references for new VPC template"
replace="s/%%ALB_SUBNET0%%/Subnet0/g"
echo "sed -i '' -e $replace $dist_dir/real-time-web-analytics-with-kinesis.template"
sed -i '' -e $replace "$dist_dir/real-time-web-analytics-with-kinesis.template"
replace="s/%%ALB_SUBNET1%%/Subnet1/g"
echo "sed -i '' -e $replace $dist_dir/real-time-web-analytics-with-kinesis.template"
sed -i '' -e $replace "$dist_dir/real-time-web-analytics-with-kinesis.template"
replace="s/%%EC2_SUBNET0%%/Subnet0/g"
echo "sed -i '' -e $replace $dist_dir/real-time-web-analytics-with-kinesis.template"
sed -i '' -e $replace "$dist_dir/real-time-web-analytics-with-kinesis.template"
replace="s/%%EC2_SUBNET1%%/Subnet1/g"
echo "sed -i '' -e $replace $dist_dir/real-time-web-analytics-with-kinesis.template"
sed -i '' -e $replace "$dist_dir/real-time-web-analytics-with-kinesis.template"

echo "Updating subnet references for existing VPC template"
replace="s/%%ALB_SUBNET0%%/Subnet0/g"

echo "sed -i '' -e $replace $dist_dir/real-time-web-analytics-with-kinesis-existing-vpc.template"
sed -i '' -e $replace "$dist_dir/real-time-web-analytics-with-kinesis-existing-vpc.template"
replace="s/%%ALB_SUBNET1%%/Subnet1/g"
echo "sed -i '' -e $replace $dist_dir/real-time-web-analytics-with-kinesis-existing-vpc.template"
sed -i '' -e $replace "$dist_dir/real-time-web-analytics-with-kinesis-existing-vpc.template"
replace="s/%%EC2_SUBNET0%%/Subnet2/g"
echo "sed -i '' -e $replace $dist_dir/real-time-web-analytics-with-kinesis-existing-vpc.template"
sed -i '' -e $replace "$dist_dir/real-time-web-analytics-with-kinesis-existing-vpc.template"
replace="s/%%EC2_SUBNET1%%/Subnet3/g"
echo "sed -i '' -e $replace $dist_dir/real-time-web-analytics-with-kinesis-existing-vpc.template"
sed -i '' -e $replace "$dist_dir/real-time-web-analytics-with-kinesis-existing-vpc.template"

echo "Updating code source bucket in template with $1"
replace="s/%%BUCKET_NAME%%/$1/g"
echo "sed -i '' -e $replace $dist_dir/real-time-web-analytics-with-kinesis.template"
sed -i '' -e $replace "$dist_dir/real-time-web-analytics-with-kinesis.template"
sed -i '' -e $replace "$dist_dir/real-time-web-analytics-with-kinesis-existing-vpc.template"

# Build WASA Zip
cd "$initial_dir/source/wasa"
npm install
npm run build
npm run zip
cp "./dist/wasa.zip" "$dist_dir/wasa.zip"

# Build Custom Resource
echo "Building CFN custom resource helper Lambda function"
cd "$initial_dir/source/custom-resource"
npm install
npm run build
npm run zip
cp "./dist/custom-resource-helper.zip" "$dist_dir/custom-resource-helper.zip"

echo "Copying web site content to $deployment_dir/dist"
cp -r "$initial_dir/source/web_site" "$dist_dir/"

echo "Generating web site manifest"
cd "$deployment_dir/manifest-generator"
npm install
node app

echo "Completed building distribution"
cd "$initial_dir"
