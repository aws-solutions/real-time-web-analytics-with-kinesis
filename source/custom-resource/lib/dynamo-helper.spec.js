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

let assert = require('chai').assert;
let expect = require('chai').expect;

let aws = require('aws-sdk-mock');

let DynamoHelper = require('./dynamo-helper');
let _dynamoHelper = new DynamoHelper();

describe('dynamoHelper', () => {

  describe('#seedData', () => {

    afterEach(() => {
      aws.restore('DynamoDB.DocumentClient');
    });

    it('should return successful if all data is put in the table', (done) => {

      aws.mock('DynamoDB.DocumentClient', 'put', (params, callback) => {
        callback(null, {});
      });

      _dynamoHelper.seedData('table-name', 'us-west-2', (err, data) => {
        assert.equal(data, 'SUCCESS');
        done();
      })
    });

    it('should return an error if the call fails', (done) => {

      aws.mock('DynamoDB.DocumentClient', 'put', (params, callback) => {
        callback('some error', {});
      });

      _dynamoHelper.seedData('table-name', 'us-west-2', (err, data) => {
        assert.equal(err, 'some error');
        done();
      })
    });
  });
});