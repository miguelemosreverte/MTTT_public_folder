
     google.charts.load('current', {'packages':['corechart']});
     google.charts.setOnLoadCallback(onLoadInitialization);
     var pieData = {};
     var pieCharts = {}
     var pieOptions = {};
     const standardOptions = {
      is3D: false,
      backgroundColor: '#edf2f6',
      'width': 500,
      'height': 500,
      'chartArea': {'width': '80%', 'height': '80%'},
      'legend':{position: 'none'},
      slices: { }
     };

     function onLoadInitialization() {

      pieChartsCategories = ["additions","deletions","mix"]

      pieChartsCategories.forEach(function(category) {
        pieCharts[category] = new google.visualization.PieChart(document.getElementById(category + '_pie_chart'));
        pieOptions[category] = standardOptions;
        });
    }
