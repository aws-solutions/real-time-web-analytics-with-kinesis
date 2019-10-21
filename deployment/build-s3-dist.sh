# Check to see if input has been provided:
if [ -z "$1" ] || [ -z "$2" ] || [ -z "$3" ]; then
    echo "Please provide the base source bucket name, trademark approved solution name and version where the lambda code will eventually reside."
    echo "For example: ./build-s3-dist.sh solutions trademarked-solution-name v1.0.0"
    exit 1
fi
 
echo "==Creating global-s3-assets & regional-s3-assets folders"
[ -e ./global-s3-assets ] && rm -r ./global-s3-assets
[ -e ./regional-s3-assets ] && rm -r ./regional-s3-assets
mkdir -p ./global-s3-assets ./regional-s3-assets

#TEMPALTE
echo "==Copying CFN Template to regional-s3-assets/ "
cp real-time-web-analytics-with-kinesis-existing-vpc.yaml ./global-s3-assets/real-time-web-analytics-with-kinesis-existing-vpc.template
cp real-time-web-analytics-with-kinesis.yaml ./global-s3-assets/real-time-web-analytics-with-kinesis.template
echo "==update CODE_BUCKET in template with $1"
replace="s/CODE_BUCKET/$1/g"
sed -i -e $replace ./global-s3-assets/real-time-web-analytics-with-kinesis-existing-vpc.template
sed -i -e $replace ./global-s3-assets/real-time-web-analytics-with-kinesis.template
echo "==update SOLUTION_NAME in template with $2"
replace="s/SOLUTION_NAME/$2/g"
sed -i -e $replace ./global-s3-assets/real-time-web-analytics-with-kinesis-existing-vpc.template
sed -i -e $replace ./global-s3-assets/real-time-web-analytics-with-kinesis.template
echo "==update CODE_VERSION in template with $3"
replace="s/CODE_VERSION/$3/g"
sed -i -e $replace ./global-s3-assets/real-time-web-analytics-with-kinesis-existing-vpc.template
sed -i -e $replace ./global-s3-assets/real-time-web-analytics-with-kinesis.template
# remove tmp file for MACs
[ -e ./global-s3-assets/real-time-web-analytics-with-kinesis.template-e ] && rm -r ./global-s3-assets/real-time-web-analytics-with-kinesis.template-e
[ -e ./global-s3-assets/real-time-web-analytics-with-kinesis-existing-vpc.template-e ] && rm -r ./global-s3-assets/real-time-web-analytics-with-kinesis-existing-vpc.template-e

#SOURCE CODE
echo "==creating custom-resource deployment package"
cd ../source/custom-resource/
rm -rf node_modules/
npm install --production
rm package-lock.json
zip -q -r9 ../../deployment/regional-s3-assets/custom-resource.zip *

echo "==creating wasa deployment package"
cd ../wasa/
rm -rf node_modules/
npm install --production
rm package-lock.json
zip -q -r9 ../../deployment/regional-s3-assets/wasa.zip *

echo "==creating wasa deployment package"
cd ../load-testing/
zip -q -r9 ../../deployment/regional-s3-assets/load-testing.zip *

echo "==copy web_site and generate manifest"
cd ../
cp -r web_site ../deployment/regional-s3-assets/

cd ../deployment/manifest-generator/
npm install --production 
node app.js --target ../regional-s3-assets/web_site --output ../regional-s3-assets/web_site/web-site-manifest.json 
