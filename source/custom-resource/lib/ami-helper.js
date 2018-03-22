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

let amiHelper = (function() {

    /**
     * @class dynamoHelper
     * @constructor
     */
    let amiHelper = function() {};

    amiHelper.prototype.getAMIByName = function(amiPattern, region, cb) {
      let ec2 = new aws.EC2({
        region: region
      });

      let describeImagesParams = {
        Filters: [{
          Name: 'name',
          Values: [amiPattern]
        }]
      };

      ec2.describeImages(describeImagesParams, (err, data) => {
        if (err) {
          console.log(err);
          cb(err);
          return;
        }

        let images = data.Images;

        console.log('describeImages callback');
        console.log(images);

        if (images.length <= 0) {
          cb(`No images match the pattern ${amiPattern}`)
        }

        images.sort((x, y) => {
          return y.Name.localeCompare(x.Name)
        });

        for (let i = 0; i < images.length; i++) {
          if (this.isBeta(images[i].Name)) continue;

          console.log(`returning amiId: ${images[i].Name}`)
          cb(null, images[i].ImageId)
          break;
        }

      });
    };

    amiHelper.prototype.isBeta = function(imageName) {
      return imageName.toLowerCase().indexOf('beta') > -1 || imageName.toLowerCase().indexOf('.rc') > -1;
    }

    return amiHelper;

})();

module.exports = amiHelper;
