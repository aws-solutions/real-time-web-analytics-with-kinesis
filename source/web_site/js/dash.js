function init() {
    console.log('starting init');
    const
        clientIdParamName = "cid",
        userPoolIdParamName = "upid",
        identityPoolIdParamName = "ipid",
        cognitoRegionParamName = "r",
        metricsTableName = "mt",
        metricDetailsTableName = "mdt";

    var cognitoAppClientId = getConfigParameterByName(clientIdParamName),
        cognitoUserPoolId = getConfigParameterByName(userPoolIdParamName),
        cognitoIdentityPoolId = getConfigParameterByName(identityPoolIdParamName),
        cognitoRegion = getConfigParameterByName(cognitoRegionParamName),
        cognitoUser,
        stackMetricsTable = getConfigParameterByName(metricsTableName),
        stackMetricDetailsTable = getConfigParameterByName(metricDetailsTableName);


    $("#userPoolId").val(cognitoUserPoolId);
    $("#identityPoolId").val(cognitoIdentityPoolId);
    $("#clientId").val(cognitoAppClientId);
    $("#userPoolRegion").val(cognitoRegion);
    $("#metricsTable").val(stackMetricsTable);
    $("#metricDetailsTable").val(stackMetricDetailsTable);

    function getConfigParameterByName(name) {
        var data = getQSParameterByName(name);
        if(data == null || data == '') {
            data = localStorage.getItem(name);
            return data;
        }
        localStorage.setItem(name, data);
        return data;
    }
    function getQSParameterByName(name, url) {
        if (!url) {
            url = window.location.href;
        }
        name = name.replace(/[\[\]]/g, "\\$&");
        var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
            results = regex.exec(url);
        if (!results) return null;
        if (!results[2]) return '';
        return decodeURIComponent(results[2].replace(/\+/g, " "));
    }

    //var colors = ["red", "green", "blue", "orange", "purple", "cyan", "magenta", "lime", "pink", "teal", "lavender", "brown", "beige", "maroon", "mint", "olive", "coral"];
    var colors = [ "#3e95cd", "#8e5ea2","#3cba9f","#e8c3b9","#c45850"];
    var dynamicColors = function(i) {
        if (i >= 0 && i < colors.length) return colors[i];
        var r = Math.floor(Math.random() * 255);
        var g = Math.floor(Math.random() * 255);
        var b = Math.floor(Math.random() * 255);
        return "rgb(" + r + "," + g + "," + b + ")";
    };

    function convertTimestamp(eventUnixTime) {
        var a = new Date(eventUnixTime);
        var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        var year = a.getFullYear();
        var month = months[a.getMonth()];
        var date = a.getDate();
        var hour = a.getHours();
        var min = a.getMinutes();
        var sec = a.getSeconds();
        var time = date + ' ' + month + ' ' + year + ' ' + hour + ':' + min + ':' + sec ;
        return time;
    }
    var identity = function(arg1) {
      return arg1;
    };

    var retained_chart_data = new Map();

    function makeBarChart(metricType, detailItems){

        if(!retained_chart_data.has(metricType)){
            var labels = [];
            var datapoints = [];
            var bgcolor = [];
            retained_chart_data.set(metricType, { labels: labels, data: datapoints, backgroundColor: bgcolor});
        }
        var elem = document.getElementById(metricType);
        var ctx = elem.getContext("2d");

        for (var i=0; i<detailItems.length; i++) {
            var idx = retained_chart_data.get(metricType).labels.findIndex( x => x == detailItems[i].METRICITEM);
            if(idx == -1){
                retained_chart_data.get(metricType).labels.push(detailItems[i].METRICITEM);
                retained_chart_data.get(metricType).data.push(detailItems[i].UNITVALUEINT == null ? detailItems[i].UNITVALUEFLOAT : detailItems[i].UNITVALUEINT);
                retained_chart_data.get(metricType).backgroundColor.push(dynamicColors(i));
                console.log('Added NEW for ' + detailItems[i].METRICITEM);
            } else {
                retained_chart_data.get(metricType).data[idx] = detailItems[i].UNITVALUEINT == null ? detailItems[i].UNITVALUEFLOAT : detailItems[i].UNITVALUEINT;
                console.log('EXISTING for ' + detailItems[i].METRICITEM);
            }
        }
        var config = {
            type: 'bar',
            data: {
                labels: retained_chart_data.get(metricType).labels,
                datasets: [{
                  data: retained_chart_data.get(metricType).data,
                  backgroundColor: retained_chart_data.get(metricType).backgroundColor
                }]
            },
            options: {
                legend: {
                    display: false
                }
            }
        };
        elem.chart && elem.chart.destroy();
        var chart = new Chart(ctx,config);
        elem.chart = chart;
    }

    function makeAmomalyBarChart(metricType, detailItems){
        var elem = document.getElementById (metricType);
        var ctx = elem.getContext("2d");
        var lables = [];
        var datapoints = [];
        var bgcolor = [];
        for (var i=0; i<detailItems.length; i++) {
            lables.push(detailItems[i].METRICITEM);
            datapoints.push(detailItems[i].UNITVALUEINT == null ? detailItems[i].UNITVALUEFLOAT : detailItems[i].UNITVALUEINT);
            bgcolor.push(dynamicColors(i));
        }
        var anomalyTime = convertTimestamp(detailItems[0].EVENTTIMESTAMP);
        console.log('anomalyTime=' + anomalyTime)
        var config = {
            type: 'bar',
            data: {
                labels: lables,
                datasets: [{
                  label : anomalyTime,
                  data: datapoints,
                  backgroundColor: bgcolor
                }]
            },
            options: {
                legend: {
                    display: true
                }
            }
        };
        elem.chart && elem.chart.destroy();
        var chart = new Chart(ctx,config);
        elem.chart = chart;
    }

    function makePieChart(metricType, detailItems){
        var elem = document.getElementById (metricType);
        var ctx = elem.getContext("2d");
        var lables = [];
        var datapoints = [];
        var bgcolor = [];
        for (var i=0; i<detailItems.length; i++) {
            lables.push(detailItems[i].METRICITEM);
            datapoints.push(detailItems[i].UNITVALUEINT);
            bgcolor.push(dynamicColors(i));
        }
        var config = {
            type: 'pie',
            data: {
                labels: lables,
                datasets: [{
                  data: datapoints,
                  backgroundColor: bgcolor
                }]
            },
            options: {
                legend: {
                    display: true
                }
            }
        };
        elem.chart && elem.chart.destroy();
        var chart = new Chart(ctx,config);
        elem.chart = chart;
    }

    function makeHorizontalBarChart(metricType, detailItems){
        var elem = document.getElementById (metricType);
        var ctx = elem.getContext("2d");
        var lables = [];
        var datapoints = [];
        var bgcolor = [];
        for (var i=0; i<detailItems.length; i++) {
            lables.push(detailItems[i].METRICITEM);
            datapoints.push(detailItems[i].UNITVALUEINT);
            bgcolor.push(dynamicColors(i));
        }
        var config = {
            type: 'horizontalBar',
            data: {
                labels: lables,
                datasets: [{
                    data: datapoints,
                    backgroundColor: bgcolor
                }]
            },
            options: {
                legend: {
                    display: false
                }
            }
        };
        elem.chart && elem.chart.destroy();
        var chart = new Chart(ctx,config);
        elem.chart = chart;
    }


    var currentTime = new Date();
    console.log(currentTime);

    var cognitoAuth = function() {

        $("#logoutLink").click( function() {
                cognitoUser.signOut();

                $("#password").val("");
                $("#loginForm").removeClass("hidden");
                $("#logoutLink").addClass("hidden");
                $("#unauthMessage").removeClass("hidden");
                $("#dashboard_content").addClass("hidden");
        });
        $("#btnSaveConfiguration").click(function (e) {

        var clientId = $("#clientId").val(),
            userPoolId = $("#userPoolId").val(),
            identityPoolId = $("#identityPoolId").val(),
            userPoolRegion = $("#userPoolRegion").val();

        console.log('clientId: %s', clientId);
        console.log('userPoolId: %s', userPoolId);
        console.log('identityPoolId: %s', identityPoolId);
        console.log('userPoolRegion: %s', userPoolRegion);

        if(clientId && userPoolId && identityPoolId && userPoolRegion){
            $("#configErr").addClass("hidden");
            localStorage.setItem(clientIdParamName, clientId);
            localStorage.setItem(userPoolIdParamName, userPoolId);
            localStorage.setItem(identityPoolIdParamName, identityPoolId);
            localStorage.setItem(cognitoRegionParamName, userPoolRegion);
            $("#cognitoModal").modal("hide");

        }
        else {
            $("#configErr").removeClass("hidden");
        }

        });

        $("#newPasswordForm").submit(function (e) {
            var newPassword = $("#newPassword").val();

            if(newPassword.length >= 8 && newPassword.match(/[a-z]/) && newPassword.match(/[A-Z]/) && newPassword.match(/[0-9]/) && newPassword == $("#newPassword2").val()) {
                $("#newPasswordModal").modal("hide");
                $("#newPasswordErr").addClass("hidden");
                $("#newPasswordMatchErr").addClass("hidden");
                $("#newPasswordComplexityErr").addClass("hidden");
                $("#btnLogin").trigger("click");
            } else {
              $("#newPasswordErr").removeClass("hidden");
              if(newPassword != $("#newPassword2").val()) {
                $("#newPasswordMatchErr").removeClass("hidden");
              } else {
                $("#newPasswordMatchErr").addClass("hidden");
              }
              if(newPassword.length < 8 || !newPassword.match(/[a-z]/) || !newPassword.match(/[A-Z]/) || !newPassword.match(/[0-9]/)) {
                $("#newPasswordComplexityErr").removeClass("hidden");
                if(newPassword.length < 8 ) {
                  $("#newPasswordLengthErr").removeClass("hidden");
                } else {
                  $("#newPasswordLengthErr").addClass("hidden");
                }
                if(!newPassword.match(/[a-z]/)) {
                  $("#newPasswordLowerErr").removeClass("hidden");
                } else {
                  $("#newPasswordLowerErr").addClass("hidden");
                }
                if(!newPassword.match(/[A-Z]/)) {
                  $("#newPasswordUpperErr").removeClass("hidden");
                } else {
                  $("#newPasswordUpperErr").addClass("hidden");
                }
                if(!newPassword.match(/[0-9]/)) {
                  $("#newPasswordNumberErr").removeClass("hidden");
                } else {
                  $("#newPasswordNumberErr").addClass("hidden");
                }
              } else {
                $("#newPasswordComplexityErr").addClass("hidden");
              }
            }
        });

        $("#loginForm").submit(function() {

            // validate that the Cognito configuration parameters have been set
            if(!cognitoAppClientId || !cognitoUserPoolId || !cognitoIdentityPoolId || !cognitoRegion) {

                $("#configErr").removeClass("hidden");
                $("#configureLink").trigger("click");
                return;
            }

            //update ui
            $(this).addClass("hidden");
            $("#signInSpinner").removeClass("hidden");

            var userName = $("#userName").val();
            var password = $("#password").val();
            var newPassword = $("#newPassword").val();

            var authData = {
                UserName: userName,
                Password: password
            };

            var authDetails = new AmazonCognitoIdentity.AuthenticationDetails(authData);

            var poolData = {
                UserPoolId: cognitoUserPoolId,
                ClientId: cognitoAppClientId
            };

            var userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
            var userData = {
                Username: userName,
                Pool: userPool
            };

            cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
            cognitoUser.authenticateUser( authDetails, {
                onSuccess: function(result) {
                    console.log('access token + ' + result.getAccessToken().getJwtToken());

                    var logins = {};
                    logins["cognito-idp." + cognitoRegion + ".amazonaws.com/" + cognitoUserPoolId] = result.getIdToken().getJwtToken();
                    var params = {
                        IdentityPoolId: cognitoIdentityPoolId,
                        Logins: logins
                    };

                    AWS.config.region = cognitoRegion;
                    AWSCognito.config.region = cognitoRegion;

                    AWS.config.credentials = new AWS.CognitoIdentityCredentials(params);

                    AWS.config.credentials.get(function(refreshErr) {
                        if(refreshErr) {
                            console.error(refreshErr);
                        }
                        else {
                            $("#unauthMessage").addClass("hidden");
                            $("#logoutLink").removeClass("hidden");
                            $("#dashboard_content").removeClass("hidden");
                            $("#signInSpinner").addClass("hidden");
                            getLatestMetrics();
                        }
                    });

            },
            onFailure: function(err) {
                $("#logoutLink").addClass("hidden");
                $("#loginForm").removeClass("hidden");
                $("#signInSpinner").addClass("hidden");

                alert(err);
            },
            newPasswordRequired: function(userAttributes, requiredAttributes) {
                // User was signed up by an admin and must provide new
                // password and required attributes, if any, to complete
                // authentication.
                console.log("New Password Required");

                var attributesData = {};
                if (newPassword.length >= 8 && newPassword.match(/[a-z]/) && newPassword.match(/[A-Z]/) && newPassword.match(/[0-9]/) && newPassword == $("#newPassword2").val()) {
                    cognitoUser.completeNewPasswordChallenge(newPassword, attributesData, this)
                } else {
                    $("#newPasswordModal").modal("show");
                }
            }

        });
    });
    }

    cognitoAuth();

    function timeNow() {
        var d = new Date(),
            h = (d.getHours()<10?'0':'') + d.getHours(),
            m = (d.getMinutes()<10?'0':'') + d.getMinutes(),
            s = (d.getSeconds()<10?'0':'') + d.getSeconds();

        return h + ':' + m + ':' + s;
    }

    var getLatestMetrics = function () {
        var docClient = new AWS.DynamoDB.DocumentClient();
        docClient.scan({ TableName : stackMetricsTable }, (err, data) => {
            if(err) {
                console.log('SCAN ERROR:' + err);
            } else {
                for(let i = 0; i<data.Items.length;i++) {
                    var crt_ts = document.getElementById(data.Items[i].MetricType).attributes[1].value;
                    if(data.Items[i].LatestEventTimestamp > crt_ts) {
                        var params = {
                            TableName : stackMetricDetailsTable,
                            KeyConditionExpression: 'MetricType = :hkey and EventTimestamp = :rkey',
                            ExpressionAttributeValues: {
                                ':hkey': data.Items[i].MetricType,
                                ':rkey': data.Items[i].LatestEventTimestamp
                            }
                        };
                        console.log('params=' + JSON.stringify(params,null,2));
                        docClient.query(params, (err, datadtl) => {
                            if(err) {
                                console.error('err=' + err);
                            } else {
                                try{
                                    if(datadtl.Count>0) {
                                        console.log(JSON.stringify(datadtl,null,2));
                                        var items = datadtl.Items[0].MetricDetails;
                                        var mtype = datadtl.Items[0].MetricType;
                                        switch(mtype) {
                                            case 'hourly_events' :
                                                makeBarChart(mtype, items);
                                                break;
                                            case 'event_anomaly' :
                                                makeAmomalyBarChart(mtype, items);
                                                break;
                                            case 'agent_count' :
                                                makePieChart(mtype, items);
                                                break;
                                            case 'referral_count' :
                                            case 'top_pages' :
                                                makeHorizontalBarChart(mtype,items);
                                                break;
                                            case 'visitor_count' :
                                                document.getElementById(mtype).innerHTML = 'Current Visitor Count:' + items[0].UNITVALUEINT;
                                                makeVisitorLineChart(mtype,items);
                                                break;
                                            case 'event_count' :
                                                makeAllEventsLineChart(items);
                                                makeEventLineChart(mtype,items);
                                                break;
                                        }
                                        document.getElementById(mtype).attributes[1].value = datadtl.Items[0].EventTimestamp;
                                    }
                                } catch (ex) {
                                    console.log('error creating chart:' + ex);
                                    console.log('datadtl=' + JSON.stringify(datadtl,null,2));
                                }
                            }
                        });
                    }
                }
            }
        });
        setTimeout( function() {
            console.log('tick\n');
            getLatestMetrics();
            var rightnow = new Date();
            document.getElementById("last_updated").innerHTML = "<H2> Last Updated: " + rightnow.toLocaleTimeString() + "</H2>";
        }, 10000);
    }

    var event_chart_time_ticks = [];
    var event_chart_dataset_labels = [];
    var event_chart_dataset_datas = [];
    var event_chart_time_ticks_display = [];

    function makeEventLineChart(mtype,items){
        dt = new Date(items[0].EVENTTIMESTAMP);
        //if there are no ticks or if the tick is not already in the array, add it
        if(event_chart_time_ticks.length == 0 || event_chart_time_ticks.indexOf(items[0].EVENTTIMESTAMP)==-1){
            event_chart_time_ticks_display.push(dt.toTimeString().split(' ')[0]);
            event_chart_time_ticks.push(items[0].EVENTTIMESTAMP);
        }
        if(event_chart_time_ticks.length>20){ //cull data over 20 data points
            event_chart_time_ticks.shift();
            event_chart_dataset_labels.shift();
            event_chart_time_ticks_display.shift();
            for(var i=0;i<event_chart_time_ticks.length;i++){
                event_chart_dataset_datas[i].shift();
            }
        }
        //go through each item and if a label already exists for it, add the data to the corresponding datas array
        for(var j=0;j < items.length ;j++)
        {
            var data_index = event_chart_dataset_labels.indexOf(items[j].METRICITEM);
            if (data_index > -1){
                event_chart_dataset_datas[data_index].push(items[j].UNITVALUEINT);
            } else {
                //if the label does not already exist, create an array with nulls for the preceding ticks
                event_chart_dataset_labels.push(items[j].METRICITEM);
                var data = Array(event_chart_time_ticks.length - 1).fill(null);
                data.push(items[j].UNITVALUEINT);
                event_chart_dataset_datas.push(data);

            }
        }
        //go through all the existing labels to see if there was a missing element
        //in this set of items.  If there was set a null in the data for this tick
        for(var j=0;j < event_chart_dataset_labels.length;j++){
            if(!findItem(items,event_chart_dataset_labels[j])) {
                event_chart_dataset_datas[j].push(null);
            }
        }
        //build the data for the chart
        var chart_datasets = [];
        for(var i = 0;i < event_chart_dataset_labels.length;i++){
         chart_datasets.push({ label: event_chart_dataset_labels[i],
            fill: false,
            spanGaps: true,
            backgroundColor: dynamicColors(chart_datasets.length+1),
            borderColor: dynamicColors(chart_datasets.length+1),
            data: event_chart_dataset_datas[i] });
        }
        var elem = document.getElementById(mtype);
        var ctx = elem.getContext("2d");
        elem.chart && elem.chart.destroy();
        var config = {
            type: "line",
            data: {labels: event_chart_time_ticks_display , datasets: chart_datasets },
            options: {
                legend: {
                    position: 'bottom'
                },
                responsive: true,
                scales: {
                    xAxes: [{
                        display: true
                    }]
            }}
        };
        var chart = new Chart(ctx,config);
        elem.chart = chart;
    }

    var all_events_chart_time_ticks = [];
    var all_events_chart_dataset_data = [];
    var all_events_chart_time_ticks_display = [];

    function makeAllEventsLineChart(items){
        dt = new Date(items[0].EVENTTIMESTAMP);
        console.log("Making all events line chart");
        //if there are no ticks or if the tick is not already in the array, add it
        if(all_events_chart_time_ticks.length == 0 || all_events_chart_time_ticks.indexOf(items[0].EVENTTIMESTAMP)==-1){
            all_events_chart_time_ticks_display.push(dt.toTimeString().split(' ')[0]);
            all_events_chart_time_ticks.push(items[0].EVENTTIMESTAMP);
        }

        //go through each item and add up the number of events
        var total_events = 0;
        for(var j=0;j < items.length;j++)
        {
            total_events += items[j].UNITVALUEINT;
            console.log(items[j].METRICITEM + ' items ' + items[j].UNITVALUEINT);
            console.log('TOTAL_EVENTS = ' + total_events);
        }
        all_events_chart_dataset_data.push(total_events);

        if(all_events_chart_time_ticks.length>60){ //cull data over 60 data points (10 min)
            all_events_chart_time_ticks.shift();
            all_events_chart_time_ticks_display.shift();
            all_events_chart_dataset_data.shift();
        }

        //build the data for the chart
        var chart_dataset = [{
            label: "All Events Count",
            fill: true,
            spanGaps: true,
            backgroundColor: "rgba(255,153,0,0.4)",
            borderColor: "rgba(255,153,0,0.4)",
            data: all_events_chart_dataset_data
        }];

        var elem = document.getElementById("all_events_count");
        var ctx = elem.getContext("2d");
        elem.chart && elem.chart.destroy();
        var config = {
            type: "line",
            data: {labels: all_events_chart_time_ticks_display , datasets: chart_dataset },
            options: {
                legend: {
                    display: false
                },
                responsive: true
            }
        };
        var chart = new Chart(ctx,config);
        elem.chart = chart;
    }

    var visitor_chart_time_ticks = [];
    var visitor_chart_dataset_data = [];
    var visitor_chart_time_ticks_display = [];

    function makeVisitorLineChart(mtype,items){
        dt = new Date(items[0].EVENTTIMESTAMP);
        //if there are no ticks or if the tick is not already in the array, add it
        if(visitor_chart_time_ticks.length == 0 || visitor_chart_time_ticks.indexOf(items[0].EVENTTIMESTAMP)==-1){
            visitor_chart_time_ticks_display.push(dt.toTimeString().split(' ')[0]);
            visitor_chart_time_ticks.push(items[0].EVENTTIMESTAMP);
            visitor_chart_dataset_data.push(items[0].UNITVALUEINT);
        }
        if(visitor_chart_time_ticks.length>20){ //cull data over 20 data points
            visitor_chart_time_ticks.shift();
            visitor_chart_time_ticks_display.shift();
            visitor_chart_dataset_data.shift();
        }

        //build the data for the chart
        var chart_dataset = [{
            label: "Visitor Count",
            fill: true,
            spanGaps: true,
            backgroundColor: "rgba(255,153,0,0.4)",
            borderColor: "rgba(255,153,0,0.4)",
            data: visitor_chart_dataset_data
        }];

        var elem = document.getElementById("visitor_count_line");
        var ctx = elem.getContext("2d");
        elem.chart && elem.chart.destroy();
        var config = {
            type: "line",
            data: {labels: visitor_chart_time_ticks_display , datasets: chart_dataset },
            options: {
                legend: {
                    display: false
                },
                responsive: true
            }
        };
        var chart = new Chart(ctx,config);
        elem.chart = chart;
    }


    function findItem(items,metricItem){
        for(var i=0;i<items.length;i++){
            if(items[i].METRICITEM==metricItem){
                return true;
            }
        }
        return false;
    }

}
