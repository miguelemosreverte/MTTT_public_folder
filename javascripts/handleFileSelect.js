
var files_contents = new Object;
var progress_bars_by_tag = {};
/*text_locations links the name of the input in where to upload
  a text file with the id of the <!> in where to show the text
*/
var text_locations = {
  "MT": "#MachineTranslationResults"
  // etc.
};

/*function_by_filename links the name of the input in where to upload
  a text file with function to perform with the new information
*/
var function_by_filename= {
  "MT": function (text) {
          $('#MachineTranslationLoading').show();
          $.ajax({
                  url:'Translate',
                  type:'POST',

                  data:"LM_name="+$("#select_LM option:selected" ).text()+"&TranslationInput="+text,
                  success:function(result){
                      maybeSetText("MT",result);
                      $('#MachineTranslationLoading').hide();
                  }
          });
      },
  "Untranslated_PE": fillTablePE,
  "Translated_PE": fillTablePE,
};

function maybeSetText(tag,text){
  if (tag in text_locations)
  {
    $(text_locations[tag]).text(text);
  }
}

  function errorHandler(evt) {
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
  }

  function updateProgress(evt,progress) {
    // evt is an ProgressEvent.
    if (evt.lengthComputable) {
      var percentLoaded = Math.round((evt.loaded / evt.total) * 100);
      // Increase the progress bar length.
      if (percentLoaded < 100) {
        progress.style.width = percentLoaded + '%';
        progress.textContent = percentLoaded + '%';
      }
    }
  }

  function addEventListenerToFileUploads(evt) {
    var elements = $('.files');
    var progress_bars = $('.percent');

    for (let element of elements) {
      progress_bar = progress_bars[Object.keys(progress_bars_by_tag).length];
      progress_bars_by_tag[element.name] = progress_bar;
      element.addEventListener('change', handleFileSelect, false);
      element.addEventListener('click', resetFileSelect, false);
    }
  }

  function resetFileSelect(evt) {
    this.value=null;
  }

  function handleFileSelect(evt) {

    //tag examples: "LM" indicates that the file should be saved as the Language Model
    var tag = this.name;

    var progress = progress_bars_by_tag[tag];
    // Reset progress indicator on new file selection.
    progress.style.width = '10%';
    progress.textContent = '0%';

    var reader = new FileReader();
    reader.onerror = errorHandler;
    reader.onprogress = updateProgress(progress);
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
      maybeSetText(tag,e.target.result);
      files_contents[tag] = e.target.result;
      if (tag in function_by_filename)
      {
        function_by_filename[tag](e.target.result);
      }
    }

    // Read in the image file as a binary string.
    file = evt.target.files[0]
    reader.readAsText(file, 'utf-8');
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
        tableContent += '<td> '+ (is_postEdition?text_area_constructor:"") + " " +
                      value[1] + (is_postEdition?"</textarea>":"") + '</td>';
        tableContent += '<td>' + (value[2] + 1) + '</td>';
        tableContent += '</tr>';
    });
    tableContent += '</tbody>'
    return tableContent;
  }

  function populateTable(bilingualPE) {

      var a = files_contents["Translated_PE"].split('\n');
      var b = bilingualPE? files_contents["Untranslated_PE"].split('\n') : a;


      $('#PostEditionTable').html(createPEorDiffTableContent(b,a,true,bilingualPE));
      $('#DifferencesTable').html(createPEorDiffTableContent(b,a,false,bilingualPE));

      const text_areas = $(".PE_TableEntry");
      for (var i = 0; i < text_areas.length; i++) {
          textAreaAdjust(text_areas[i]);
      }
  };

  function fillTablePE(file)
  {
    const valid_files = ((files_contents["Untranslated_PE"] !== undefined && files_contents["Translated_PE"] !== undefined)
    || (!$('#BilingualPE').is(":checked") && files_contents["Translated_PE"] !== undefined));

    const bilingualPE = $('#BilingualPE').is(":checked");
    //const valid_files = (files_contents["Translated_PE"] !== undefined);
    if(valid_files)
    {
      populateTable(bilingualPE);
      $("#SavePostEditionButton").show();
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
    $.ajax({
            url:'CorpusPreparation',
            type:'POST',
            data:
              "source_lang=" + $('#source_lang  option:selected').text()
              + "&target_lang=" + $('#target_lang  option:selected').text()
              + "&LM_name=" + $('#LM_name').val()
              +"&TM_source=" + files_contents["TM_source"]
              + "&TM_target=" + files_contents["TM_target"]
              + "&LM=" + files_contents["LM"],
            success:function(result){
                $("#CorpusPreparationResults").html(result);
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
        else if(files_contents["TM_source"] === undefined) {alert("Set a source for Translation Model");}
        else if(files_contents["TM_target"] === undefined) {alert("Set a target for Translation Model");}
        else if(files_contents["LM"] === undefined) {alert("Set a file for the Language Model");}
        else{
            TryToPostTheCorpusPreparation();
        }
    });
  });

  $(function(){
    $("#EvaluationForm").submit(function(event){
        event.preventDefault();
        var checkboxes = document.querySelectorAll('#EvaluationCheckboxes input[type="checkbox"]');
        var checkedOne = Array.prototype.slice.call(checkboxes).some(x => x.checked);
        if(files_contents["UneditedMT"] === undefined) {alert("Set a source for Unchanged_MT");}
        else if(files_contents["EditedMT"] === undefined) {alert("Set a target for Changed_MT");}
        else if (!checkedOne){alert("Check atleast one evaluation script");}
        else{
          $('#EvaluateLoading').show();
          $.ajax({
                  url:'Evaluation',
                  type:'POST',
                  data:$(this).serialize() + "&UneditedMT=" + files_contents["UneditedMT"] + "&EditedMT=" + files_contents["EditedMT"],
                  success:function(result){
                      $("#EvaluationResults").text(result);
                      $('#EvaluateLoading').hide();
                  }
          });
        }
    });
  });

  $(document).ready(function(){
    addEventListenerToFileUploads();

    $('#BilingualPE').click(function(e){
      fillTablePE(null);
    });

});
