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

let AMIHelper = require('./ami-helper');
let _amiHelper = new AMIHelper();

describe('amiHelper', () => {

  describe('#getAMIByName', () => {

    let _describe_images_data = {
      Images:[
        {
          CreationDate: '2017-06-06T19:11:19.000Z',
          ImageId: 'ami-XXXXXXXX',
          Public: true,
          Name: 'amzn-ami-hvm-2016.09.0.20161028-x86_64-gp2',
        },
        {
          CreationDate: '2016-12-20T23:24:47.000Z',
          ImageId: 'ami-YYYYYYYY',
          Public: true,
          Name: 'amzn-ami-hvm-2016.09.1.20161221-x86_64-gp2',
        }
      ]
    }

    afterEach(() => {
      aws.restore('EC2');
    });

    it('should return the AMI ID of the latest image', (done) => {

      aws.mock('EC2', 'describeImages', (params, callback) => {
        callback(null, _describe_images_data);
      });

      _amiHelper.getAMIByName('ami-name-with-*-wildcard', 'us-west-2', (err, amiID) => {
        assert.isNull(err);
        assert.equal(amiID, 'ami-YYYYYYYY');
        done();
      })
    });

    it('should return an error message if `describeImages` fails', () => {
      aws.mock('EC2', 'describeImages', (params, callback) => {
        callback('some error');
      });

      _amiHelper.getAMIByName('ami-name-with-*-wildcard', 'us-west-2', (err, amiID) => {
        assert.isUndefined(amiID);
      });
    });

  });

  describe('#isBeta', () => {
    it('should return true if imageName contains \'beta\'', () => {
      assert.isTrue(_amiHelper.isBeta('name-containing-beta'))
    });

    it('should return true if imageName contains \'.rc\'', () => {
      assert.isTrue(_amiHelper.isBeta('name-containing-.rc'))
    });

    it('should return false if imageName contains neither \'beta\' nor \'rc\'', () => {
      assert.isFalse(_amiHelper.isBeta('name-containing-neither'))
    });
  });
});