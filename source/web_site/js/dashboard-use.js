$(document).ready(function() {
    if(_dashboard_usage === 'True') {
        $.ajax({
            url: 'https://metrics.awssolutionsbuilder.com/page',
            type: 'POST',
            crossDomain: true,
            data: JSON.stringify(_hit_data),
            dataType: 'json',
            headers: {
                'Content-Type': 'application/json'
            },
            success: function(data) {
                console.log('Successfully sent page hit to metrics');
                console.log(data);
            },
            error: function(xhr, ajaxOptions, thrownError) {
                console.log('Error sending page hit to metrics');
            }
        });
    } else {
        console.log('Dashboard use metrics disabled');
    }
});
