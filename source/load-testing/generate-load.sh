#!/bin/bash

# By default, this script will run 15 tests generating sequentially more load
# by adding 1 parallel worker per test number.
# The 1st test will generate 1 worker, the 2nd test 2 parallel workers,
# up to 15 parallel workers.  Each parallel worker will generate
# 500,000 requests.
# For additional load, total_tests can be increased to add more testing
# iterations, or parallel_workers_multiplier can be increased to run more
# parallel workers per iteration. For example, parallel_workers_multiplier=5
# will result in 5x parallel workers per testing iteration.
# The output for each testing iteration will be located in logs/test#.log

# URL of the beacon servers: http://ALB-DNS-NAME/beacon
export beacon_url="BEACON_SERVER_ALB_URL"
# Number of requests each worker should make
export requests_per_worker=500000
# Number of tests to run
export total_tests=15
# Multiplier for the number of parallel workers per test
export parallel_workers_multiplier=1
# Delay between requests in seconds (e.g. 0.1 = 100ms)
export request_delay=0

mkdir -p logs
rm logs/*

for ((j=1;j<=$total_tests;j++));
do
    workers=$(($j*$parallel_workers_multiplier))
    echo "Test #$j - $workers x $requests_per_worker `date`"
    log="logs/test$j.log"
    echo "$workers x $requests_per_worker - `date`" > $log
    echo -e "Test\tSuccess\tError\tTotal\tTime_Taken" >> $log
    for ((i=1;i<$workers;i++));
    do
        echo -e "$i\t`python ./test-beacon.py $beacon_url $requests_per_worker $request_delay`" >> $log &
    done
    echo -e "$i\t`python ./test-beacon.py $beacon_url $requests_per_worker $request_delay`" >> $log
    echo `date` >> $log
done
