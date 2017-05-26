
  var ammount_of_changes =  {};
  var ammount_of_changes_as_array = [];
  var changed_rows =  {
        additions : new Set(),
        deletions : new Set(),
        mix : new Set()
  };

  function generalized_recalculated_stats(option){
    //option can be "additions"|"deletions"|"mix"
    // set the ammount_of_changes_as_array
    ammount_of_changes_as_array = [];
    ammount_of_changes_as_array.push(["RowIndex",option])
    for (const key of Object.keys(ammount_of_changes)) {
        ammount_of_changes_as_array.push([key,ammount_of_changes[key][option]])
    }
    // set ammount_of_changes_as_array as the pie data table
    pieData[option] = google.visualization.arrayToDataTable(ammount_of_changes_as_array)
    // add option specific properties to the standard options
    pieOptions[option].title = option;
    // draw the pie
    pieCharts[option].draw(pieData[option], pieOptions[option]);
  }

  function generalized_offsetSlice(option, rowIndex)
  {
    //option can be "additions"|"deletions"|"mix"
    pieOptions[option].slices = {  };
    // offset the slice by 0.2
    pieOptions[option].slices[Object.keys(ammount_of_changes).indexOf(rowIndex.toString())] = {offset: 0.2};
    // draw the pie
    pieOptions[option].title = option;
    pieCharts[option].draw(pieData[option], pieOptions[option]);
  }

  function map_to_pie_charts(passed_function, argumentList){
    for (const key of Object.keys(pieCharts)) {
        passed_function(key, argumentList);
    }
  }

  pie_charts_functions = {
    recalculate_stats : function (args){
        //using Function.prototype.apply with null as self reference
        map_to_pie_charts.apply(null,[generalized_recalculated_stats].concat(args));
    },
    offsetSlice : function(args){
        //using spread syntax
        map_to_pie_charts(...[generalized_offsetSlice].concat(args));
    }
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


  function scroll(is_postEdition, rowTop){
      var containerID = '#scrollContent' + (is_postEdition?'PostEditionTable':'DifferencesTable')
      $(containerID).animate({scrollTop:rowTop},500);
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
      needsToSavePostEditionProgress = false;
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

    $("#StartPostEditing").click(function(e){
        //reset changes
        ammount_of_changes =  {};
        changed_rows =  {
              additions : new Set(),
              deletions : new Set(),
              mix : new Set()
        };
        fillTablePE()
    });

    $('#PostEditionTable').on('change', 'td textarea', function()
    {
      needsToSavePostEditionProgress = true

      const rowIndex = $(this).closest('tr').index();
      const rowIndexPlusOne = $(this).closest('tr').index() + 1;
      var unmodified_MT = $('#Differences tr:eq('+rowIndexPlusOne+') td:eq('+0+')').html().split(/\s+/);
      var modified_MT = $(this).val().split(/\s+/);
      var row_additions = 0;
      var row_deletions = 0;

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
                  row_deletions += references[0].slice(five_tuple[1],five_tuple[2]).length;
            }else{
                colored_references[0]  += references[0].slice(five_tuple[3],five_tuple[4]).join(" ") + " ";
                colored_references[1]  += span_start.replace("the_color",green)+ references[1].slice(five_tuple[3],five_tuple[4]).join(" ")  + span_end + " ";
                row_additions += references[1].slice(five_tuple[3],five_tuple[4]).length;
            }
        }
        else if (type == "equal"){
            colored_references[0]  += references[0].slice(five_tuple[1],five_tuple[2]).join(" ") + " ";
            colored_references[1]  += references[1].slice(five_tuple[3],five_tuple[4]).join(" ") + " ";
        }
        else if (type == "replace"){
            row_additions += references[1].slice(five_tuple[3],five_tuple[4]).length;
            row_deletions += references[0].slice(five_tuple[1],five_tuple[2]).length;
            alert("At replace row_additions is " + row_additions + "and row_deletions is " + row_deletions)
            colored_references[0]  += span_start.replace("the_color",red)+ references[0].slice(five_tuple[1],five_tuple[2]).join(" ")  + span_end + " ";
            colored_references[1]  += span_start.replace("the_color",green)+ references[1].slice(five_tuple[3],five_tuple[4]).join(" ")  + span_end + " ";
        }
      }
      const row = $('#Differences').eq(rowIndexPlusOne);
      $('#Differences tr:eq('+rowIndexPlusOne+') td:eq('+0+')').html(colored_references[0]);
      $('#Differences tr:eq('+rowIndexPlusOne+') td:eq('+1+')').html(colored_references[1]);


      if (!(rowIndexPlusOne in ammount_of_changes)) {
        ammount_of_changes[rowIndexPlusOne] = {
              additions: 0,
              deletions: 0,
              mix: 0
        };
      }

      ammount_of_changes[rowIndexPlusOne].additions += row_additions
      ammount_of_changes[rowIndexPlusOne].deletions += row_deletions
      ammount_of_changes[rowIndexPlusOne].mix += row_deletions + row_additions
      pie_charts_functions.recalculate_stats()

      if (row_additions>0) changed_rows.additions.add(rowIndex)
      if (row_deletions>0) changed_rows.deletions.add(rowIndex)
      if (row_deletions>0 || row_additions>0) changed_rows.mix.add(rowIndex)

      fillSearchTable("#StatisticsSearch1", "", true);
      fillSearchTable("#StatisticsSearch2", "", true);
      fillSearchTable("#StatisticsSearch3", "", true);
    });

    function fillSearchTable(ID, searched_text, show_all = false){
      //reset the table
      $(ID+'Table').html("");
      //check if the table is scrollable
      const hasTableToScroll = (typeof $(ID.replace("Search","")+"Table tr td:eq(0)").offset() !== 'undefined');
      const isAboutStatistics = ! hasTableToScroll;
      //then set the table to iterate or scroll
      const TableID = (hasTableToScroll ? ID.replace("Search","") : "#PostEdition") + "Table";
      // then define the initial offset
      const initial_offset =  hasTableToScroll ? $(TableID+" tr td:eq(0)").offset().top - $(TableID+" tr td:eq(0)").height() / 2 : 0;

      $(TableID+" tr td:nth-child(1)").each(function() {
        const rowIndex = $(this).closest('tr').index();
        const rowIndexPlusOne = $(this).closest('tr').index() + 1;
        if (isAboutStatistics && (changed_rows[(ID.indexOf(1)!=-1)?"additions":(ID.indexOf(2)!=-1)?"deletions":"mix"].has(rowIndex))
        || hasTableToScroll)
        {
          row_top = $(this).closest('tr').offset().top - initial_offset
          //TODO do this by batches, as the user scrolls
          if ($(this).text().toUpperCase().indexOf(searched_text.toUpperCase()) !== -1 && searched_text.length>0
          || show_all)
          {
            onclick_action = hasTableToScroll ?
                              'scroll('+ (ID == "#PostEditionSearch") +','+row_top+')'
                              :'pie_charts_functions.offsetSlice('+rowIndexPlusOne+')'
            button_constructor = '<tr><td>'
                      +'<button '
                      + 'class="textSearch"'
                      + 'onclick= ' + onclick_action
                      +'>'+rowIndexPlusOne+'<br>'+$(this).text()+'</button></td></tr>'
            $(ID+"Table").append(button_constructor);
          }
        }
      });
    }


    $('.Search').on('input',function(e){
      //set the search text
      const searched_text = $(this).val();
      //get identificator
      const ID = '#' + $(this).attr('id');

      if (searched_text == ""){
        const hasTableToScroll = (typeof $(ID.replace("Search","")+"Table tr td:eq(0)").offset() !== 'undefined');
        const isAboutStatistics = !hasTableToScroll;
        if (isAboutStatistics){
          fillSearchTable(ID,"", true);
        }
      }else{
        fillSearchTable(ID, searched_text)
      }
    });

    $("#download_LM").click(function(e){
      text = $('#select_LM  option:selected').text();
      location.href = "GetLM?LM_name="+text;
      });

    $("#upload_username_button").click(function(e){
        $.ajax({
                  url:'SetUsername',
                  type:'POST',
                  data: $('#upload_username_input').val()

        });
      });

});
