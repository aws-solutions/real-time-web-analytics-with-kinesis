/*********************************************************************************************************************
 *  Copyright 2016 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           *
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

'use strict';

console.log('Loading function');

const AWS = require('aws-sdk');
const https = require('https');
const url = require('url');
const moment = require('moment');

const UUID = require('node-uuid');
const MetricsHelper = require('./lib/metrics-helper');
const KinesisAppHelper = require('./lib/kinesis-helper');
const WebsiteHelper = require('./lib/website-helper');
const AMIHelper = require('./lib/ami-helper');
const DynamoHelper = require('./lib/dynamo-helper');

/**
 * Request handler.
 */
exports.handler = (event, context, callback) => {
    console.log('Received event:', JSON.stringify(event, null, 2));

    let responseStatus = 'FAILED';
    let responseData = {};

    if (event.RequestType === 'Delete') {
        if (event.ResourceProperties.CustomResourceAction === 'SendMetric') {
            responseStatus = 'SUCCESS';

            let _metricsHelper = new MetricsHelper();

            let _metric = {
                Solution: process.env.SOLUTION_ID,
                UUID: event.ResourceProperties.UUID,
                TimeStamp: moment().utc().format('YYYY-MM-DD HH:mm:ss.S'),
                Data: {
                    Version: process.env.SOLUTION_VERSION,
                    RequestType: event.RequestType,
                    Deleted: moment().utc().format()
                }
            };

            _metricsHelper.sendAnonymousMetric(_metric, function(err, data) {
                if (err) {
                    responseData = {
                        Error: 'Sending metrics helper delete failed'
                    };
                    console.log([responseData.Error, ':\n', err].join(''));
                }
                sendResponse(event, callback, context.logStreamName, 'SUCCESS');
            });
        } else {
            sendResponse(event, callback, context.logStreamName, 'SUCCESS');
        }
    }

    if (event.RequestType === 'Create') {
        if (event.ResourceProperties.CustomResourceAction === 'ConfigureWebsite') {
            let _websiteHelper = new WebsiteHelper();

            _websiteHelper.copyWebSiteAssets(event.ResourceProperties.SourceS3Bucket,
                event.ResourceProperties.SourceS3Key, event.ResourceProperties.WebsiteBucket,
                event.ResourceProperties.UserPoolId, event.ResourceProperties.UserPoolClientId,
                event.ResourceProperties.IdentityPoolId, event.ResourceProperties.MetricsTableName,
                event.ResourceProperties.MetricDetailsTableName, event.ResourceProperties.Region,
                event.ResourceProperties.UUID,
                function(err, data) {
                    if (err) {
                        responseData = {
                            Error: 'Copy of website assets failed'
                        };
                        console.log([responseData.Error, ':\n', err].join(''));
                    } else {
                        responseStatus = 'SUCCESS';
                        responseData = {};
                    }

                    sendResponse(event, callback, context.logStreamName, responseStatus, responseData);
                });

        } else if (event.ResourceProperties.CustomResourceAction === 'StartKinesisApplication') {
          console.log('startKinesisApplication');
          let _kinesisAppHelper = new KinesisAppHelper();

          _kinesisAppHelper.startApplication(event.ResourceProperties.ApplicationName, event.ResourceProperties.Region,
              function(err, data) {
                  if (err) {
                      responseData = {
                          Error: 'Starting kinesis application failed'
                      };
                      console.log([responseData.Error, ':\n', err].join(''));
                  } else {
                      responseStatus = 'SUCCESS';
                      responseData = {};
                  }

                  sendResponse(event, callback, context.logStreamName, responseStatus, responseData);
              });

        } else if (event.ResourceProperties.CustomResourceAction === 'GenerateUUID') {
            responseStatus = 'SUCCESS';
            responseData = {
                UUID: UUID.v4()
            };
            sendResponse(event, callback, context.logStreamName, responseStatus, responseData);

        } else if (event.ResourceProperties.CustomResourceAction === 'SendMetric') {
            let _metricsHelper = new MetricsHelper();

            let _metric = {
                Solution: process.env.SOLUTION_ID,
                UUID: event.ResourceProperties.UUID,
                TimeStamp: moment().utc().format('YYYY-MM-DD HH:mm:ss.S'),
                Data: {
                    Version: process.env.SOLUTION_VERSION,
                    SendAnonymousData: process.env.SEND_ANONYMOUS_DATA,
                    Launch: moment().utc().format(),
                    RequestType: event.RequestType,
                    EnableSSH: event.ResourceProperties.EnableSSH,
                    NodeSize: event.ResourceProperties.NodeSize,
                    CWDashboard: event.ResourceProperties.CWDashboard,
                    AutoScalingMinSize: event.ResourceProperties.AutoScalingMinSize,
                    AutoScalingMaxSize: event.ResourceProperties.AutoScalingMaxSize
                }
            };

            _metricsHelper.sendAnonymousMetric(_metric, function(err, data) {
                if (err) {
                    responseData = {
                        Error: 'Sending anonymous launch metric failed'
                    };
                    console.log([responseData.Error, ':\n', err].join(''));
                } else {
                    responseStatus = 'SUCCESS';
                    responseData = {};
                }
            });
            sendResponse(event, callback, context.logStreamName, 'SUCCESS');

        } else if (event.ResourceProperties.CustomResourceAction === 'GetAMI') {

            console.log('GetAMI');

            let _amiHelper = new AMIHelper();
            let amiName = event.ResourceProperties.AMIName;
            let region = process.env.AWS_REGION;

            console.log(`region: ${region}`)

            _amiHelper.getAMIByName(amiName, region, (err, amiId) => {

                console.log(`_amiHelper callback`);
                console.log(`amiId: ${amiId}`);

                if (err) {
                    responseData = {
                        Error: `Error retrieving AMI ID for ${amiName}`
                    };
                    console.log([responseData.Error, ':\n', err].join(''));
                }
                responseStatus = 'SUCCESS';
                responseData = {
                    amiId: amiId
                };

                console.log(`responseStatus: ${responseStatus}`);

                sendResponse(event, callback, context.logStreamName, responseStatus, responseData);
            });

        } else if (event.ResourceProperties.CustomResourceAction === 'SeedDynamoTable') {

            let _dynamoHelper = new DynamoHelper();
            let tableName = event.ResourceProperties.TableName;
            let region = process.env.AWS_REGION;

            _dynamoHelper.seedData(tableName, region, (err, data) => {

                if (err) {
                    responseData = {
                        Error: `Error seeding dynamo table ${tableName}`
                    };
                    console.log([responseData.Error, ':\n', err].join(''));
                }
                responseStatus = 'SUCCESS';
                responseData = {};
                sendResponse(event, callback, context.logStreamName, responseStatus, responseData);
            });

        } else {
            console.log('CustomResourceAction is not defined');
            sendResponse(event, callback, context.logStreamName, 'FAILED');
        }

    }

};

/**
 * Sends a response to the pre-signed S3 URL
 */
let sendResponse = function(event, callback, logStreamName, responseStatus, responseData) {
    const responseBody = JSON.stringify({
        Status: responseStatus,
        Reason: `See the details in CloudWatch Log Stream: ${logStreamName}`,
        PhysicalResourceId: logStreamName,
        StackId: event.StackId,
        RequestId: event.RequestId,
        LogicalResourceId: event.LogicalResourceId,
        Data: responseData,
    });

    console.log('RESPONSE BODY:\n', responseBody);
    const parsedUrl = url.parse(event.ResponseURL);
    const options = {
        hostname: parsedUrl.hostname,
        port: 443,
        path: parsedUrl.path,
        method: 'PUT',
        headers: {
            'Content-Type': '',
            'Content-Length': responseBody.length,
        }
    };

    const req = https.request(options, (res) => {
        console.log('STATUS:', res.statusCode);
        console.log('HEADERS:', JSON.stringify(res.headers));
        callback(null, 'Successfully sent stack response!');
    });

    req.on('error', (err) => {
        console.log('sendResponse Error:\n', err);
        callback(err);
    });

    req.write(responseBody);
    req.end();
};
