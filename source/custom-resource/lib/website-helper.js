/*********************************************************************************************************************
 *  Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Amazon Software License (the "License"). You may not use this file except in compliance        *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://aws.amazon.com/asl/                                                                                    *
 *                                                                                                                    *
 *  or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/

/**
 * @author Solution Builders
 */

'use strict';

let AWS = require('aws-sdk');
let s3 = new AWS.S3();
const fs = require('fs');
const _downloadKey = 'real-time-web-analytics-with-kinesis/latest/web-site-manifest.json';
const _downloadLocation = '/tmp/web-site-manifest.json';

/**
 * Helper function to interact with s3 hosted website for cfn custom resource.
 *
 * @class websiteHelper
 */
let websiteHelper = (function() {

    /**
     * @class websiteHelper
     * @constructor
     */
    let websiteHelper = function() {};

    /**
     * Provisions the web site UI at deployment.
     * @param {string} sourceS3Bucket - Bucket containing the web site files to be copied.
     * @param {string} sourceS3prefix - S3 prefix to prepend to the web site manifest file names to be copied.
     * @param {string} userPoolId - Cognito User Pool Id for web site configuration
     * @param {string} userPoolClientId - Cognito User Pool Client Id for web site configuration
     * @param {copyWebSiteAssets~requestCallback} cb - The callback that handles the response.
     */
    websiteHelper.prototype.copyWebSiteAssets = function(sourceS3Bucket, sourceS3prefix, websiteBucket,
        userPoolId, userPoolClientId, identityPoolId, metricsTableName, metricDetailsTableName, region, uuid, cb) {
        console.log("Copying UI web site");
        console.log(['source bucket:', sourceS3Bucket].join(' '));
        console.log(['source prefix:', sourceS3prefix].join(' '));
        console.log(['destination bucket:', websiteBucket].join(' '));
        console.log(['user pool:', userPoolId].join(' '));
        console.log(['user pool client:', userPoolClientId].join(' '));
        console.log(['identity pool:', identityPoolId].join(' '));
        console.log(['region:', region].join(' '));
        console.log(['mt:', metricsTableName].join(''));
        console.log(['mdt:', metricDetailsTableName].join(''));

        downloadWebsiteManifest(sourceS3Bucket, _downloadKey, _downloadLocation, function(err, data) {
            if (err) {
                console.log(err);
                return cb(err, null);
            }

            console.log('data:', data);

            fs.readFile(_downloadLocation, 'utf8', function(err, data) {
                if (err) {
                    console.log(err);
                    return cb(err, null);
                }

                console.log(data);
                let _manifest = validateJSON(data);

                if (!_manifest) {
                    return cb('Unable to validate downloaded manifest file JSON', null);
                } else {
                    uploadFile(_manifest.files, 0, websiteBucket, [sourceS3Bucket, sourceS3prefix]
                        .join('/'),
                        function(err, result) {
                            if (err) {
                                return cb(err, null);
                            }

                            console.log(result);

                            createAppVariables(userPoolId, userPoolClientId, identityPoolId, region, websiteBucket, metricsTableName, metricDetailsTableName, uuid,
                                function(err, createResult) {
                                    if (err) {
                                        return cb(err, null);
                                    }

                                    return cb(null, result);
                                });
                        });
                }

            });

        });

    };

    /**
     * Helper function to validate the JSON structure of contents of an import manifest file.
     * @param {string} body -  JSON object stringify-ed.
     * @returns {JSON} - The JSON parsed string or null if string parsing failed
     */
    let validateJSON = function(body) {
        try {
            let data = JSON.parse(body);
            console.log(data);
            return data;
        } catch (e) {
            // failed to parse
            console.log('Manifest file contains invalid JSON.');
            return null;
        }
    };

    let createAppVariables = function(userPoolId, userPoolClientId, identityPoolId, region, websiteBucket, metricsTableName, metricsDetailsTableName, uuid, cb) {
        console.log("Creatng AppVariables");
        console.log(['destination bucket:', websiteBucket].join(' '));
        console.log(['user pool:', userPoolId].join(' '));
        console.log(['user pool client:', userPoolClientId].join(' '));
        console.log(['identity pool:', identityPoolId].join(' '));
        console.log(['region:', region].join(' '));
        console.log(['mt:', metricsTableName].join(''));
        console.log(['mdt:', metricsDetailsTableName].join(''));
        var _content = [
            ['localStorage.setItem(\'upid\', \'', userPoolId, '\');'].join(''),
            ['localStorage.setItem(\'cid\', \'', userPoolClientId, '\');'].join(''),
            ['localStorage.setItem(\'ipid\', \'', identityPoolId, '\');'].join(''),
            ['localStorage.setItem(\'r\', \'', region, '\');'].join(''),
            ['localStorage.setItem(\'mt\', \'', metricsTableName, '\');'].join(''),
            ['localStorage.setItem(\'mdt\', \'', metricsDetailsTableName, '\');'].join(''),
            ['var _dashboard_usage = \'', process.env.SEND_ANONYMOUS_DATA, '\';'].join(''),
            ['var _hit_data = {'],
            ['    \'Solution\': \'SO0038\','],
            ['    \'UUID\': \'', uuid, '\','].join(''),
            ['    \'TimeStamp\': moment().utc().format(\'YYYY-MM-DD HH:mm:ss.S\'),'],
            ['    \'Data\': {'],
            ['        \'RequestType\': \'Dashboard\','],
            ['        \'dashboard\': 1,'],
            ['        \'region\': \'', region, '\''].join(''),
            ['    }'],
            ['};']
        ].join('\n');
        console.log(_content);
        let params = {
            Bucket: websiteBucket,
            Key: 'js/app-variables.js',
            Body: _content
        };

        s3.putObject(params, function(err, data) {
            if (err) {
                console.log(err);
                return cb('error creating js/app-variables.js file for website UI', null);
            }

            console.log(data);
            return cb(null, data);
        });

    };

    let uploadFile = function(filelist, index, websiteBucket, sourceS3prefix, cb) {
        if (filelist.length > index) {
            let params = {
                Bucket: websiteBucket,
                Key: filelist[index],
                CopySource: [sourceS3prefix, filelist[index]].join('/'),
            };
            if (filelist[index].endsWith('.htm') || filelist[index].endsWith('.html')) {
                params.ContentType = "text/html";
                params.MetadataDirective = "REPLACE";
            } else if (filelist[index].endsWith('.css')) {
                params.ContentType = "text/css";
                params.MetadataDirective = "REPLACE";
            } else if (filelist[index].endsWith('.js')) {
                params.ContentType = "application/javascript";
                params.MetadataDirective = "REPLACE";
            } else if (filelist[index].endsWith('.png')) {
                params.ContentType = "image/png";
                params.MetadataDirective = "REPLACE";
            } else if (filelist[index].endsWith('.jpg') || filelist[index].endsWith('.jpeg')) {
                params.ContentType = "image/jpeg";
                params.MetadataDirective = "REPLACE";
            } else if (filelist[index].endsWith('.gif')) {
                params.ContentType = "image/gif";
                params.MetadataDirective = "REPLACE";
            };

            s3.copyObject(params, function(err, data) {
                if (err) {
                    return cb(['error copying ', [sourceS3prefix, filelist[index]].join('/'), '\n', err]
                        .join(
                            ''),
                        null);
                }

                console.log([
                    [sourceS3prefix, filelist[index]].join('/'), 'uploaded successfully'
                ].join(' '));
                let _next = index + 1;
                uploadFile(filelist, _next, websiteBucket, sourceS3prefix, function(err, resp) {
                    if (err) {
                        return cb(err, null);
                    }

                    cb(null, resp);
                });
            });
        } else {
            cb(null, [index, 'files copied'].join(' '));
        }

    };

    /**
     * Helper function to download the website manifest to local storage for processing.
     * @param {string} s3_bucket -  Amazon S3 bucket of the website manifest to download.
     * @param {string} s3_key - Amazon S3 key of the website manifest to download.
     * @param {string} downloadLocation - Local storage location to download the Amazon S3 object.
     * @param {downloadManifest~requestCallback} cb - The callback that handles the response.
     */
    let downloadWebsiteManifest = function(s3Bucket, s3Key, downloadLocation, cb) {
        let params = {
            Bucket: s3Bucket,
            Key: s3Key
        };

        console.log(params);

        // check to see if the manifest file exists
        s3.headObject(params, function(err, metadata) {
            if (err) {
                console.log(err);
            }

            if (err && err.code === 'NotFound') {
                // Handle no object on cloud here
                console.log('file doesnt exist');
                return cb('Manifest file was not found.', null);
            } else {
                console.log('file exists');
                console.log(metadata);
                let file = require('fs').createWriteStream(downloadLocation);

                s3.getObject(params).
                on('httpData', function(chunk) {
                    file.write(chunk);
                }).
                on('httpDone', function() {
                    file.end();
                    console.log('website manifest downloaded for processing...');
                    return cb(null, 'success');
                }).
                send();
            }
        });
    };

    return websiteHelper;

})();

module.exports = websiteHelper;
