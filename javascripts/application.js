
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


    function scroll(is_postEdition, rowTop){
        var containerID = '#scrollContent' + (is_postEdition?'PostEditionTable':'DifferencesTable')
        $(containerID).animate({scrollTop:rowTop},500) ;
    }

  function GetAvailableLanguages(){
    $.ajax({
              url:'GetAvailableLanguages',
              type:'GET',
              success:function(result){
              const parsedResult = result;
              $('#source_lang').empty();
              $('#target_lang').empty();
              for(var k in parsedResult) {
                $('#source_lang').append($('<option>', {
                    value : k,
                    text : parsedResult[k]
                }));
                $('#target_lang').append($('<option>', {
                    value : k,
                    text : parsedResult[k]
                }));
              }
            }
    });
  }

  $(document).ready(function(){

    GetAvailableLMs();
    GetAvailableLanguages();
    $('#select_LM').change(function(e){
      $.ajax({
          type: "POST",
          url: "setLM",
          data:"LM_name="+$("#select_LM option:selected" ).text()
      });
    });

    $("#TrainingButton").click(function(e){
        e.preventDefault();
        $("#TrainingLoading").show();
        $.ajax({
            type: "POST",
            url: "Train",
            success: function(result) {
                $("#TrainingResults").text(result);
                $("#TrainingLoading").hide();
            },
            error: function(result) {
                if (result.responseText.indexOf("TTT instance has no attribute 'language_model_name") !== -1)
                {
                  $("#TrainingResults").text("You need to create a model first, using the tab Corpus Preparation");
                  $("#TrainingLoading").hide();
                }
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

    $("#StartMachineTranslation").click(function(e){
           $('#MachineTranslationLoading').show();
           $.ajax({
                   url:'Translate',
                   type:'POST',
                   data:"LM_name="+$("#select_LM option:selected" ).text()+"&TranslationInput="+ files_contents["MT"],
                   success:function(result){
                       maybeSetText("MT",result);
                       $('#MachineTranslationLoading').hide();
                   }
           });
    });

    $('#PostEditionTable').on('change', 'td textarea', function()
    {
      var unmodified_MT = $(this).closest('td').prev('td').html().split(/\s+/);
      var modified_MT = $(this).val().split(/\s+/);


      const references = [unmodified_MT,modified_MT];
      const colored_references = ["",""];
      const s = new difflib.SequenceMatcher(null, unmodified_MT, modified_MT);
      const optcodes = s.getOpcodes();
      const green = "#04B404";
      const red = "#FE2E2E";
      const span_start ='<span style="background-color:the_color;"> ';
      const span_end ='</span>';
      const tuple_offset = [0, 2];
      for (var index = 0; index < optcodes.length; index++){
        const five_tuple = optcodes[index];
        const type = five_tuple[0]; //type can be "replace"|"insert"|"equal"|"delete"
        const enumerated_types = (type =="equal")? 3 : (type =="replace")? 2: (type == "insert")? 1: (type == "delete")? 0:-1;
        if (type == "delete" || type == "insert"){
            if (type=="delete"){
                  colored_references[0]  += span_start.replace("the_color",red)+ references[0].slice(five_tuple[1],five_tuple[2]).join(" ")  + span_end + " ";
            }else{
                colored_references[0]  += references[0].slice(five_tuple[3],five_tuple[4]).join(" ") + " ";
                colored_references[1]  += span_start.replace("the_color",green)+ references[1].slice(five_tuple[3],five_tuple[4]).join(" ")  + span_end + " ";
            }
        }
        else if (type == "equal"){
            colored_references[0]  += references[0].slice(five_tuple[1],five_tuple[2]).join(" ") + " ";
            colored_references[1]  += references[1].slice(five_tuple[3],five_tuple[4]).join(" ") + " ";
        }
        else if (type == "replace"){
            colored_references[0]  += span_start.replace("the_color",red)+ references[0].slice(five_tuple[1],five_tuple[2]).join(" ")  + span_end + " ";
            colored_references[1]  += span_start.replace("the_color",green)+ references[1].slice(five_tuple[3],five_tuple[4]).join(" ")  + span_end + " ";
        }
      }
      const rowIndex = $(this).closest('tr').index() + 1;
      const row = $('#Differences').eq(rowIndex);
      $('#Differences tr:eq('+rowIndex+') td:eq('+0+')').html(colored_references[0]);
      $('#Differences tr:eq('+rowIndex+') td:eq('+1+')').html(colored_references[1]);
    });


    $('#DifferencesSearch, #PostEditionSearch').on('input',function(e){
      is_postEdition = ($(this).attr('id') == "PostEditionSearch")
      incompleteTableID = (is_postEdition? '#PostEdition':'#Differences');
      $(incompleteTableID+'SearchTable').html("");
      searched_text = $(this).val();

      initial_offset = $(incompleteTableID+"Table tr td:eq(0)").offset().top - $(incompleteTableID+"Table tr td:eq(0)").height() / 2
      $(incompleteTableID+"Table tr td:odd").each(function() {
        rowIndex = $(this).closest('tr').index() + 1;
        row_top = $(this).closest('tr').offset().top - initial_offset
        //TODO do this by batches, as the user scrolls
        if ($(this).text().toUpperCase().indexOf(searched_text.toUpperCase()) !== -1 && searched_text.length>0){
          button_constructor = '<tr><td>'
                    +'<button '
                    + 'class="textSearch"'
                    + 'onclick="scroll('+is_postEdition+','+row_top+')" '
                    +'>'+rowIndex+'<br>'+$(this).text()+'</button></td></tr>'
          $(incompleteTableID+'SearchTable').append(button_constructor);
        }
      });
    });

    $("#download_LM").click(function(e){
      text = $('#select_LM  option:selected').text();
      location.href = "GetLM?LM_name="+text;
      });

});
