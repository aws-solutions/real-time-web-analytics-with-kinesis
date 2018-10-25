'use strict';
const AWS = require('aws-sdk');
const moment = require('moment');

var docClient = new AWS.DynamoDB.DocumentClient();

var METRIC_DETAILS_TABLE = process.env.METRIC_DETAILS_TABLE;
var METRIC_TABLE = process.env.METRIC_TABLE;

const MetricsHelper = require('./lib/metrics-helper');

AWS.config.update({
    region: process.env.AWS_REGION,
    endpoint : 'https://dynamodb.' + process.env.AWS_REGION + '.amazonaws.com'
});

// 7 days.
var EXPIRE_TIME = 604800;

exports.handler = (event, context, callback) => {
    var uniqueMetricDetailKeys = new Map();

    var metricRecordsBatch = event.Records.map((record) => JSON.parse(Buffer.from(record.kinesis.data, 'base64')));
    var total_events = 0;
    // Loop through all the records and retain a map of all the unique keys.
    for (let i = 0; i < metricRecordsBatch.length; i++ ) {
        if (validationCheck(metricRecordsBatch[i])) {
            var objKey = metricRecordsBatch[i].METRICTYPE + '|' + metricRecordsBatch[i].EVENTTIMESTAMP;
            if (uniqueMetricDetailKeys.has(objKey)) {

                // Already captured.
            } else {
                uniqueMetricDetailKeys.set(objKey, {
                    EVENTTIMESTAMP : metricRecordsBatch[i].EVENTTIMESTAMP,
                    METRICTYPE : metricRecordsBatch[i].METRICTYPE
                });
            }
            if (metricRecordsBatch[i].METRICTYPE === 'event_count') {
              total_events+=metricRecordsBatch[i].UNITVALUEINT;
              console.log('total_events = ' + total_events);
            }
        }
    }
    docClient.scan({ TableName : METRIC_TABLE }, (err, metricMetadata) => {
        if (!err) {

            // Create an array of all the detail records that match each key.
            uniqueMetricDetailKeys.forEach((value, key) => {
                var metricTypeSet = metricRecordsBatch.filter((item) => item.EVENTTIMESTAMP == value.EVENTTIMESTAMP && item.METRICTYPE == value.METRICTYPE);
                upsert(metricTypeSet, metricMetadata.Items);
            });
        } else {
            console.error('Unable to retrieve metric metadata from ' + METRIC_TABLE + ': ' + err);
        }

        // Determine the latest timestamp for each metric type.
        var LatestTimestampPerMetric = new Map();
        uniqueMetricDetailKeys.forEach((value, key) => {
            if (LatestTimestampPerMetric.has(value.METRICTYPE)){
                if (value.EVENTTIMESTAMP > LatestTimestampPerMetric[value.METRICTYPE]) {
                    LatestTimestampPerMetric[value.METRICTYPE] = value.EVENTTIMESTAMP;
                }
            } else {

                console.log('value: ', value);

                var idx = getMetricIndex(metricMetadata.Items, value.METRICTYPE);

                console.log(`idx: ${idx}`);
                console.log(metricMetadata.Items[idx]);

                if (typeof metricMetadata.Items[idx] === 'undefined') {
                    console.log('metricMetadata.Items[idx] === \'undefined\'');
                } else {
                    if (value.EVENTTIMESTAMP > metricMetadata.Items[idx].LatestEventTimestamp) {
                        LatestTimestampPerMetric.set(value.METRICTYPE, value.EVENTTIMESTAMP );
                    }
                }
            }
        });

        // Update the latest timestamp from each of the keys to the metrics table.
        LatestTimestampPerMetric.forEach((value,key) => {
            var MetricTableParams = {
                TableName: METRIC_TABLE,
                Key: { MetricType : key },
                UpdateExpression : 'set #a = :x',
                ExpressionAttributeNames : { '#a' : 'LatestEventTimestamp' },
                ExpressionAttributeValues : { ':x' : value }
            };
            docClient.update(MetricTableParams, (err,data) => {
                if (err) { console.error(err); }
            });
        });
    });

    if (process.env.SEND_ANONYMOUS_DATA === 'True' && total_events > 0) {
        try {
            let _metricsHelper = new MetricsHelper();

            let _metric = {
                Solution: process.env.SOLUTION_ID,
                UUID: process.env.SOLUTION_UUID,
                TimeStamp: moment().utc().format('YYYY-MM-DD HH:mm:ss.S'),
                Data: {
                    Version: process.env.SOLUTION_VERSION,
                    EventsProcessed: total_events,
                    RequestType: 'Event'
                }
            }

            console.log('sending metric: ', _metric);

            _metricsHelper.sendAnonymousMetric(_metric, (err, data) => {
                if (err) {
                    console.log('error sending metrics: ', err);
                }

                callback(null, "done");
            });

        } catch (err) {
            console.error('Error sending anonymous usage data: ', err);
            callback(null, "done");
        }

    } else {
        callback(null, "done");
    }

};

function upsert(metricTypeSet, allMetrics) {
    var firstItem = metricTypeSet[0];
    var ExpireTime = firstItem.EVENTTIMESTAMP + EXPIRE_TIME;
    var metricDetailParams = {
        TableName : METRIC_DETAILS_TABLE,
        Item : {
            MetricType : firstItem.METRICTYPE,
            EventTimestamp : firstItem.EVENTTIMESTAMP,
            ExpireTime : ExpireTime,
            MetricDetails : metricTypeSet
        },
        ConditionExpression : 'attribute_not_exists(MetricType)'
    };

    try {
        if (firstItem.METRICTYPE == 'hourly_events') {
            console.log('try to put a new hourly_events item for ' + firstItem.EVENTTIMESTAMP);
        }

        docClient.put(metricDetailParams, function (err, data) {
            if (err) {
                if (err.code == "ConditionalCheckFailedException") {
                    if (firstItem.METRICTYPE == 'hourly_events') {
                        console.log('There is already a record there for hourly_events, ' + firstItem.EVENTTIMESTAMP);
                    }
                    amendMetric(metricTypeSet,allMetrics);
                } else {
                    console.error('Error updating metric detail table: ' + JSON.stringify(err,null,2));
                }
            }
        });
    } catch (err) {
        console.error('Unable to save records to DynamoDB: ', err);
    }
};

function amendMetric(metric_list,allMetrics) {
    var params = {
      TableName: METRIC_DETAILS_TABLE,
      KeyConditionExpression: 'MetricType = :hkey and EventTimestamp = :rkey',
      ExpressionAttributeValues: {
        ':hkey': metric_list[0].METRICTYPE,
        ':rkey': metric_list[0].EVENTTIMESTAMP
      }
    };

    // Get the existing data from other METRIC_DETAILS_TABLE.
    docClient.query(params, (err, itemToAmend) => {
        if (!err) {
            var detailsToAmend = itemToAmend.Items[0].MetricDetails;
            var metricIndex = getMetricIndex(allMetrics,metric_list[0].METRICTYPE);

            // If metric is not found, don't do anything.
            if (metricIndex === -1) {
                return
            }

            var amendmentStrategy = allMetrics[metricIndex].AmendmentStrategy;
            var isWholeNumberMetric = allMetrics[metricIndex].IsWholeNumber;

            console.log('metric:', allMetrics[metricIndex]);
            console.log('amendmentStrategy: %s', amendmentStrategy);

            if (itemToAmend.Items[0].MetricType == 'hourly_events') {
                console.log('item to amend:\n' + JSON.stringify(itemToAmend,null,2) + '\nWITH\n' + JSON.stringify(metric_list,null,2));
            }
            switch (amendmentStrategy) {
                case 'add':

                    // For each item, find a match and add the values or add a new item.
                    metric_list.map( (item) => {
                        var detailIndex = getMetricDetailIndex(detailsToAmend, item.METRICITEM);

                        // Same metric exists in existing set.
                        if (detailIndex > -1) {
                            if (isWholeNumberMetric){
                                detailsToAmend[detailIndex].UNITVALUEINT = detailsToAmend[detailIndex].UNITVALUEINT + item.UNITVALUEINT;
                            } else {
                                detailsToAmend[detailIndex].UNITVALUEFLOAT = detailsToAmend[detailIndex].UNITVALUEFLOAT + item.UNITVALUEFLOAT;
                            }
                        } else {
                            detailsToAmend.push(item);
                        }
                    });

                // If it exists, replace with updated value, if it is new, append it.
                case 'replace_existing':

                    // For each item, find a match.
                    metric_list.map( (item) => {
                        var detailIndex = getMetricDetailIndex(detailsToAmend, item.METRICITEM);

                        // Same metric exists in existing set.
                        if (detailIndex > -1) {
                            detailsToAmend[detailIndex] = item;
                        } else {
                            detailsToAmend.push(item);
                        }
                    });
                    break;
                case 'replace':
                    detailsToAmend = metric_list;
                    break;
                default:
                    console.error('Unexpected amemdment strategy \'' + amendmentStrategy + '\'');
            }

            if (detailsToAmend) {
                var ExpireTime = metric_list[0].EVENTTIMESTAMP + EXPIRE_TIME;
                var amendedParams = {
                    TableName : METRIC_DETAILS_TABLE,
                    Item : {
                        MetricType : metric_list[0].METRICTYPE,
                        EventTimestamp : metric_list[0].EVENTTIMESTAMP,
                        ExpireTime : ExpireTime,
                        MetricDetails : detailsToAmend
                    }
                };

                if (metric_list[0].METRICTYPE == 'hourly_events') {
                    console.log('new details = \n' + JSON.stringify(amendedParams,null,2));
                };

                docClient.put(amendedParams, (err,data) => {
                    if (err) {
                        console.error('Error amending record:' + err + ' data ='  + JSON.stringify(data,null,2));
                    }

                });
            }
        } else {

            // Could not get details.
            console.error('Could not get expected results from the details table.', err);

        }
    });
};

function getMetricDetailIndex(searchArray, metricItem) {
  for (let i = 0; i < searchArray.length; i++) {
    if (searchArray[i].METRICITEM == metricItem) {
      return i;
    }
  }

  // Not found
  return -1;
};

function getMetricIndex(searchArray, metricType) {
    for (let i = 0; i < searchArray.length; i++) {
        if (searchArray[i].MetricType == metricType) {
            return i;
        }
    }

    // Not found.
    return -1;
};

function validationCheck(metricRecord) {
    try {
        return metricRecord.METRICTYPE != null && metricRecord.EVENTTIMESTAMP > 0;
    } catch (err) {
        console.error('Invalid metric record ' + JSON.stringify(metricRecord,null,2));
        return false;
    }
};
