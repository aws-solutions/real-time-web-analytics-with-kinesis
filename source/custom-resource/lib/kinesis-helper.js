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

/**
 * Helper function to turn on a Kinesis Analytics app cfn custom resource.
 *
 * @class bucketEncryptionHelper
 */
let kinesisAnalyticsAppHelper = (function() {

    /**
     * @class bucketEncryptionHelper
     * @constructor
     */
    let kinesisAnalyticsAppHelper = function() {};

    /**
     * Starts a Kinesis Data Analytics application.
     * @param {string} ApplicationName - Name of the Kinesis Data Analytics application.
     * @param {copyWebSiteAssets~requestCallback} cb - The callback that handles the response.
     */
    kinesisAnalyticsAppHelper.prototype.startApplication = function(ApplicationName, region, cb) {
        console.log(['Looking up Kinesis Data Analytics application:', ApplicationName].join(' '));
        
        AWS.config.update({region: region})

        let ka = new AWS.KinesisAnalytics();

        var params = {
          ApplicationName: ApplicationName
        };
        ka.describeApplication(params, function(err, response) {
          console.log('response: ', response);
          if (err) {
            console.log(['Failed to describe application:', err].join(' '));
            return cb(err, null);
          } else {
            if (response == null) {
              console.log(['Could not find application:', ApplicationName].join(' '));
              return cb(['Kinesis Data Analytics application,', ApplicationName, ', could not be found!'].join(' '), null);
            }
            if (response.ApplicationDetail.ApplicationStatus === 'READY') {
                //Start App
                params = {
                  ApplicationName: ApplicationName,
                  InputConfigurations: [
                    {
                      'Id': '1.1',
                      'InputStartingPositionConfiguration': {
                          'InputStartingPosition': 'NOW'
                      }
                    }
                  ]
                };
                console.log("Starting application");
                ka.startApplication(params, function(err, response) {
                  if (err) {
                    console.log(['Failed to start application', item.ApplicationName, ': ', err].join(' '));
                    return cb(err, null);
                  } else {
                    return cb(null, "SUCCESS");
                  }
                });
            } else {
              return cb(['Kinesis Data Analytics Application was not in READY state (app status === ', response.ApplicationDetail.ApplicationStatus,')'].join(''), null);
            }
          }
        });
    };

    return kinesisAnalyticsAppHelper;

})();

module.exports = kinesisAnalyticsAppHelper;
