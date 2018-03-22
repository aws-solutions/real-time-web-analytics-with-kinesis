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

let aws = require('aws-sdk');

let dynamoHelper = (function() {

    /**
     * @class dynamoHelper
     * @constructor
     */
    let dynamoHelper = function() {};

    dynamoHelper.prototype.seedData = function(tableName, region, cb) {
      let docClient = new aws.DynamoDB.DocumentClient({
        region: region
      });

      let seedData = [
        { MetricType:'event_count', AmendmentStrategy:'add', IsSet:true, IsWholeNumber:true, LatestEventTimestamp:0 },
        { MetricType:'hourly_events', AmendmentStrategy:'replace_existing', IsSet:true, IsWholeNumber:true, LatestEventTimestamp:0 },
        { MetricType:'top_pages', AmendmentStrategy:'add', IsSet:true, IsWholeNumber:true, LatestEventTimestamp:0 },
        { MetricType:'visitor_count', AmendmentStrategy:'add', IsSet:false, IsWholeNumber:true, LatestEventTimestamp:0 },
        { MetricType:'referral_count', AmendmentStrategy:'add', IsSet:true, IsWholeNumber:true, LatestEventTimestamp:0 },
        { MetricType:'event_anomaly', AmendmentStrategy:'replace', IsSet:false, IsWholeNumber:false, LatestEventTimestamp:0 },
        { MetricType:'agent_count', AmendmentStrategy:'add', IsSet:true, IsWholeNumber:true, LatestEventTimestamp:0 }
      ]

      let hasError = false;

      for (let i = 0; i < seedData.length; i++) {
        if (!hasError) {
          let item = seedData[i];

          let metricDetailParams = {
            TableName: tableName,
            Item: item,
            ConditionExpression: 'attribute_not_exists(MetricType)'
          };

          docClient.put(metricDetailParams, (err, data) => {
            if (err) {
              hasError = true;
              console.log(err);
              cb(err);
              return;
            }
          });
        }
      }

      cb(null, 'SUCCESS');
    };

    return dynamoHelper;

})();

module.exports = dynamoHelper;