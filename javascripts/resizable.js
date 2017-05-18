$( function() {
  $( ".resizableFieldSet" ).resizable({
    handles: 'e',

    resize: function() {
      var resizableFieldSet = $(".resizableFieldSet");
      var resizableFieldSet2 = $(".resizableFieldSet2");
      var resizableFieldSetContainer = $(".resizableFieldSetContainer");
      var newWidth = resizableFieldSetContainer.innerWidth() - resizableFieldSet.outerWidth();
      var minWidth = resizableFieldSetContainer.css("min-width");
      if (newWidth > minWidth)
        resizableFieldSet2.outerWidth(newWidth);
      }
    });
  });
