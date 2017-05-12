    function updateDiffTable(element,event)
    {

     }
    //credit: http://stackoverflow.com/questions/2897619/using-html5-javascript-to-generate-and-save-a-file
    function download(filename, text) {
        var pom = document.createElement('a');
        pom.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
        pom.setAttribute('download', filename);

        if ( document.createEvent) {
            var event =  document.createEvent('MouseEvents');
            event.initEvent('click', true, true);
            pom.dispatchEvent(event);
        }
        else {
            pom.click();
        }
    }
  $(document).ready(function(){

    $("#TrainingButton").click(function(e){
        e.preventDefault();
        $.ajax({
            type: "POST",
            url: "Train",
            success: function(result) {
                $("#TrainingResults").text(result);
            },
            error: function(result) {
                alert('error');
            }
        });
    });

    $("#SavePostEditionButton").click(function(e){
      var text = $.map($('#PostEditionTable td:nth-child(2)'),function(td){
         return $(td).text();
      }).join('\n');
      filename = $("#Translated_PE").val();
      filename = filename.split('\\').pop(); //remove fake path
      download(filename, text);


    });


    $('#PostEditionTable').on('change', 'td input', function()
    {
       const unmodified_MT = $(this).closest('td').prev('td').html();
       const modified_MT = $(this).val();
       const references = [unmodified_MT,modified_MT];
       const creferences = ["",""];
       const s = new difflib.SequenceMatcher(null, unmodified_MT, modified_MT);
       const optcodes = s.getOpcodes();

       //alert(unmodified_MT + "\n" + modified_MT + "\n" + s.getOpcodes());
      const green = "green";
      const red = "red";
      const colors = [red,green];
      const span_start ='<span style="background-color:the_color;"> ';
      const span_end ='</span>';
      const tuple_offset = [0, 2];
      const type = five_tuple[0]; //type can be "replace"|"insert"|"equal"|"delete"
      //alert(colored+ s.getOpcodes());
      for (var index = 0; index < optcodes.length; index++){
        var five_tuple = optcodes[index];
        var enumerated_types = (type =="equal")? 3 : (type =="replace")? 2: (type == "insert")? 1: (type == "delete")? 0:-1;
        var t = (enumerated_types==0)? 0: 1; //t is short for type, in this case 0 means delete, 1 means any other type
        var i1 = five_tuple[1 + tuple_offset[t]];
        var i2 = five_tuple[2 + tuple_offset[t]];
        if (type == "delete" || type == "insert"){
            creferences[t]  += span_start.replace("the_color",colors[t])+ references[t].substring(i1,i2)  + span_end;
        }
        else if (type == "equal"){
            creferences[0]  += references[0].substring(i1,i2);
            creferences[1]  += references[1].substring(i1,i2);
        }
        else if (type == "replace"){
            creferences[0]  += span_start.replace("the_color",colors[0])+ references[0].substring(i1,i2)  + span_end;
            creferences[1]  += span_start.replace("the_color",colors[1])+ references[1].substring(i1,i2)  + span_end;
        }
      }
      var rowIndex = $(this).closest('tr').index() + 1;
      var row = $('#PostEditionTable2').eq(rowIndex);
      $('#PostEditionTable2 tr:eq('+rowIndex+') td:eq('+0+')').html(creferences[0]);
      $('#PostEditionTable2 tr:eq('+rowIndex+') td:eq('+1+')').html(creferences[1]);



});


    $('#PostEditionTable td').change(function() {
      alert("done!");

     })

});
