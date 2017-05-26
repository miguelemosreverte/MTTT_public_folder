
    var uploaders = [];


var UI_state = new Object;
UI_state.files_contents = {};
UI_state.progress_bars_by_tag = {};
UI_state.constants = {};
UI_state.constants.text_locations = {
  /*UI_state.constants.text_locations links the name of the input in where to voldemort
    a text file with the id of the <!> in where to show the text
  */
  "MT": "#MachineTranslationResults"
  // etc.
};
UI_state.constants.function_by_filename = {
  /*UI_state.constants.function_by_filename links the name of the input in where to voldemort
    a text file with function to perform with the new information
  */
  //"MT":, // the automated start of translation has been erased, now a button is used
  //"Untranslated_PE": fillTablePE, //this function will also be performed by a button
  //"Translated_PE": fillTablePE,  //and so is this one

  //insert here functions to be performed right after file contents are uploaded
};
UI_state.file_manipulation_functions = {

  errorHandler : function (evt) {
    switch(evt.target.error.code) {
      case evt.target.error.NOT_FOUND_ERR:
        alert('File Not Found!');
        break;
      case evt.target.error.NOT_READABLE_ERR:
        alert('File is not readable');
        break;
      case evt.target.error.ABORT_ERR:
        break; // noop
      default:
        alert('An error occurred reading this file.');
    };
  },

  updateProgress : function (evt,progress) {
    // evt is an ProgressEvent.
    if (evt.lengthComputable) {
      var percentLoaded = Math.round((evt.loaded / evt.total) * 100);
      // Increase the progress bar length.
      if (percentLoaded < 100) {
        progress.style.width = percentLoaded + '%';
        progress.textContent = percentLoaded + '%';
      }
    }
  },

  addEventListenerToFileUploads : function (evt) {
    var elements = $('.files');
    var progress_bars = $('.percent');

    for (let element of elements) {
      progress_bar = progress_bars[Object.keys(UI_state.progress_bars_by_tag).length];
      UI_state.progress_bars_by_tag[element.name] = progress_bar;
      element.addEventListener('change', UI_state.file_manipulation_functions.handleFileSelect, false);
      element.addEventListener('click', UI_state.file_manipulation_functions.resetFileSelect, false);
    }
  },

  resetFileSelect : function (evt) {
      this.value=null;
  },

  upload : function (username, blobOrFile) {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', '/uploadFiles', true);
      xhr.onloadend = function (e) {
          uploaders.pop();
          if (!uploaders.length) {
              console.log(' All Done! ');
          }
      };
      uploaders.push(xhr);
      //xhr.send(blobOrFile);
      xhr.send(JSON.stringify({ name : username, text: blobOrFile}))
  },

  handleFileSelect : function (evt) {

      //tag examples: "LM" indicates that the file should be saved as the Language Model
      var tag = this.name;

      var progress = UI_state.progress_bars_by_tag[tag];
      // Reset progress indicator on new file selection.
      progress.style.width = '10%';
      progress.textContent = '0%';

      var reader = new FileReader();
      reader.onerror = UI_state.file_manipulation_functions.errorHandler;
      reader.onprogress = UI_state.file_manipulation_functions.updateProgress(progress);
      reader.onabort = function(e) {
        alert('File read cancelled');
      };
      reader.onloadstart = function(e) {
        $('#progress_bar').className = 'loading';
      };
      reader.onload = function(e) {
        // Ensure that the progress bar displays 100% at the end.
        progress.style.width = '100%';
        progress.textContent = '100%';
        setTimeout("$('#progress_bar').className='';", 2000);

        UI_state.files_contents[tag] = e.target.result;
        if (tag in UI_state.constants.function_by_filename){
          UI_state.constants.function_by_filename[tag](e.target.result);
        }
        if (tag in UI_state.constants.text_locations){
          $(UI_state.constants.text_locations[tag]).text(e.target.result);
        }


        blob = UI_state.files_contents[tag]
        var BYTES_PER_CHUNK, SIZE, NUM_CHUNKS, start, end;

        BYTES_PER_CHUNK = 1048576;
        SIZE = blob.size;
        NUM_CHUNKS = Math.max(Math.ceil(SIZE / BYTES_PER_CHUNK), 1);
        start = 0;
        end = BYTES_PER_CHUNK;
        while (start < SIZE) {
            upload(tag, blob.slice(start, end));
            start = end;
            end = start + BYTES_PER_CHUNK;
        }
      }

      // Read in the image file as a binary string.
      const file = evt.target.files[0]
      reader.readAsText(file, 'utf-8');
      //reader.readAsDataURL( file )
    }

}







  function textAreaAdjust(o) {
    o.style.height = "1px";
    o.style.height = (o.scrollHeight)+"px";
  }

  function createPEorDiffTableContent(a,b,is_postEdition,bilingualPE) {
    var tableContent = '<thead><tr><th>'
                      + (bilingualPE?'Untranslated Source':'Unedited MT')
                      + '</th><th>'
                      + (bilingualPE?'Machine Translated':'Edited MT')
                      +'</th></tr></thead><tbody>';
    const text_area_constructor = '<textarea class="PE_TableEntry" onkeyup="textAreaAdjust(this)">'

    var c = a.map(function (e, i) {
        return [e, b[i], i];
    });
    $.each(c , function(key,value){
        tableContent += '<tr>';
        tableContent += '<td>' + value[0] + '</td>';
        tableContent += '<td>'+ (is_postEdition?text_area_constructor:"")+
                      value[1] + (is_postEdition?"</textarea>":"") + '</td>';
        tableContent += '<td>'+ (value[2] + 1) + '</td>';
        tableContent += '</tr>';
    });
    tableContent += '</tbody>'
    return tableContent;
  }

  function populateTable(bilingualPE) {
      if ( 'undefined' === typeof needsToSavePostEditionProgress) needsToSavePostEditionProgress = false;
      if (needsToSavePostEditionProgress){alert("You should save your work first!");}
      else{
        var a = UI_state.files_contents["Translated_PE"].split('\n');
        var b = bilingualPE? UI_state.files_contents["Untranslated_PE"].split('\n') : a;


        $('#PostEditionTable').html(createPEorDiffTableContent(b,a,true,bilingualPE));
        $('#DifferencesTable').html(createPEorDiffTableContent(a,a,false,false));

        const text_areas = $(".PE_TableEntry");
        for (var i = 0; i < text_areas.length; i++) {
            textAreaAdjust(text_areas[i]);
        }
      }
  };

  function fillTablePE(file)
  {
    const valid_files = ((UI_state.files_contents["Untranslated_PE"] !== undefined && UI_state.files_contents["Translated_PE"] !== undefined)
    || (!$('#BilingualPE').is(":checked") && UI_state.files_contents["Translated_PE"] !== undefined));

    const bilingualPE = $('#BilingualPE').is(":checked");
    if(valid_files)
    {
      populateTable(bilingualPE);
    }
  }


  function GetAvailableLMs(){
    $.ajax({
              url:'GetAvailableLMs',
              type:'GET',
              success:function(result){
                const parsedResult = result;
                $('#select_LM').empty();
                for(var k in parsedResult) {
                  $('#select_LM').append($('<option>', {
                      value : k,
                      text : parsedResult[k]
                  }));
                }
                if (parsedResult.length > 0) {
                    $("#download_LM").css("visibility","visible");
                }
            }
    });
  }



  function PostTheCorpusPreparation(){
    //inner debugging function
    const toType = function(obj) {
      return ({}).toString.call(obj).match(/\s([a-zA-Z]+)/)[1].toLowerCase()
    }

    const tm_source = UI_state.files_contents["TM_source"]//.split("\n");
    const tm_target = UI_state.files_contents["TM_target"]//.split("\n");

    //const blob_tm_source = new Blob(tm_source, { type: "text/plain" });
    //const blob_tm_target = new Blob(tm_target, { type: "text/plain" });

    const moses_data = {
      source_lang : $('#source_lang  option:selected').text()
      , target_lang : $('#source_lang  option:selected').text()
      , LM_name : $('#LM_name').val()
      , TM_source : tm_source
      , TM_target : tm_target
      , LM : UI_state.files_contents["LM"]
    };
    console.log(moses_data);
    $.ajax({
        url:'CorpusPreparation',
        type:'POST',
        data : moses_data,
        success:function(resp){
          $("#CorpusPreparationResults").html(resp);
          $('#CorpusLoading').hide();
        },
        error: function(err){
          alert("There was an error, try again.")
          $('#CorpusLoading').hide();
        }
    });
  }

  function TryToPostTheCorpusPreparation(){
    $('#CorpusLoading').show();
    $.ajax({
              url:'GetAvailableLMs',
              type:'GET',
              success:function(result){
                  const parsedResult = result;
                  $('#select_LM').empty();
                  for(var k in parsedResult) {
                    $('#select_LM').append($('<option>', {
                        value : k,
                        text : parsedResult[k]
                    }));
                  }

                  if($('#source_lang  option:selected').text() === $('#target_lang  option:selected').text()){
                    alert("Select different source and target languages");
                  }
                  else {
                    PostTheCorpusPreparation()
                  }
              },
              error: function(err){
                  alert("There was an error, try again.")
                  $('#CorpusLoading').hide();
              }
    });
  }


  $(function(){
    $("#CorpusPreparationForm").submit(function(event){
        event.preventDefault();


        if(!$('#LM_name').val()>0) {alert("Set a name for the Language Model");}
        else if ($('#select_LM').text().includes($('#LM_name').val()) )
                                                           {alert("This model name has been already taken.");}
        else if($('#source_lang  option:selected').text() === $('#target_lang  option:selected').text())
                                                           {alert("Select different source and target languages");}
        else if(UI_state.files_contents["TM_source"] === undefined) {alert("Set a source for Translation Model");}
        else if(UI_state.files_contents["TM_target"] === undefined) {alert("Set a target for Translation Model");}
        else if(UI_state.files_contents["LM"] === undefined) {alert("Set a file for the Language Model");}
        else{
            //TryToPostTheCorpusPreparation();
        }
    });
  });

  $(function(){
    $("#EvaluationForm").submit(function(event){
        event.preventDefault();
        var checkboxes = document.querySelectorAll('#EvaluationCheckboxes input[type="checkbox"]');
        var checkedOne = Array.prototype.slice.call(checkboxes).some(x => x.checked);
        if(UI_state.files_contents["UneditedMT"] === undefined) {alert("Set a source for Unchanged_MT");}
        else if(UI_state.files_contents["EditedMT"] === undefined) {alert("Set a target for Changed_MT");}
        else if (!checkedOne){alert("Check atleast one evaluation script");}
        else{
          $('#EvaluateLoading').show();
          $.ajax({
                  url:'Evaluation',
                  type:'POST',
                  data:$(this).serialize() + "&UneditedMT=" + UI_state.files_contents["UneditedMT"] + "&EditedMT=" + UI_state.files_contents["EditedMT"],
                  success:function(result){
                      $("#EvaluationResults").text(result);
                      $('#EvaluateLoading').hide();
                  }
          });
        }
    });
  });

  $(document).ready(function(){
    UI_state.file_manipulation_functions.addEventListenerToFileUploads();

    $('#BilingualPE').click(function(e){
      if (!$('#PostEditionTable').is(':empty')) {
        var EditedMT_html=[];
        $('#PostEditionTable textarea').each( function(){EditedMT_html.push( $(this).val() );});
        const valid_files = ((UI_state.files_contents["Untranslated_PE"] !== undefined && UI_state.files_contents["Translated_PE"] !== undefined)
        || (!$('#BilingualPE').is(":checked") && UI_state.files_contents["Translated_PE"] !== undefined));

        const bilingualPE = $('#BilingualPE').is(":checked");
        if(valid_files)
        {

                var a = UI_state.files_contents["Translated_PE"].split('\n');
                var b = bilingualPE? UI_state.files_contents["Untranslated_PE"].split('\n') : a;

                $('#PostEditionTable').html(createPEorDiffTableContent(b,(EditedMT_html[0]===undefined)?a:EditedMT_html,true,bilingualPE));

                const text_areas = $(".PE_TableEntry");
                for (var i = 0; i < text_areas.length; i++) {
                    textAreaAdjust(text_areas[i]);
                }
          $("#SavePostEditionButton").show();
        }
      }
    });
});
