var deckSelector = "#deck-selector",
    storage = document.body,
    deckID;

$(function(){
  var loader = $("#loading")/*,
      controls = $("<div/>",{
        "id":    "slide-control",
        "class": "hide",
        "html":   '<span class="glyphicon glyphicon-search"></span> <span class="glyphicon glyphicon-plus"></span>'
      }).appendTo("body")*/;
  //loader.modal("show");

  // load data, refresh deck selector
  $.when( getDecks(), getSlides() ).done(function(){
    // refresh ui
    refreshDeckSelector();
    //remove loading
    //loader.modal("hide");
  });


  // change deck
  $(deckSelector).on("change",function(){
    // load slides based on selected deck
    loadSlides();
  });

  // click on slides to preview
  $("#slides, #optional_slides").on("click",".slide",function(e){
    var preview = $("#slide_preview"),
        slide = $(this),
        tags = "",
        from_deck = slide.parents(".slideDeck");
      $.each(slide.data("tags").split(","), function(i, tag){
        tags += "<span>" + tag + "</span>";
      });
      preview.find("button").addClass("hide");
      preview.find(".preview").html(slide.clone().append($("<div/>", {
        "class":  "tags",
        "html":   tags
      })));
      preview.find("button.largerView").removeClass("hide").data({
        "thumbnail_lg": slide.data("thumbnail_lg"),
        "title": slide.attr("title")
      });
      if(from_deck.attr("id") == "slides"){
        // remove button
        if(!slide.hasClass("required")) preview.find("button.toggle").removeClass("hide").data("slide-id",slide.data("id")).addClass("remove-slide").html('<span class="glyphicon glyphicon-remove"></span> Remove Slide');
      }else{
        // add button'
        preview.find("button.toggle").removeClass("hide").data("slide-id",slide.data("id")).addClass("add-slide").html('<span class="glyphicon glyphicon-plus"></span> Add Slide');
      }
      // preview group
      if(preview.find(".group").length > 0){
        preview.find(".group").prepend('<span class="cycle-next glyphicon glyphicon-chevron-right"></span><span class="cycle-prev glyphicon glyphicon-chevron-left"></span>').cycle({
          timeout: 0
        });
      }
  });

  // preview model data transfer
  $('#largerPreview').on('show.bs.modal', function (e) {
    var modal = $(this),
        slide = $(e.relatedTarget);
    modal.find(".modal-body img").attr("src", slide.data("thumbnail_lg"));
    modal.find(".modal-header h4").text(slide.data("title"));
  });

  // preview add / remove buttons clicks
  $("#slide_preview").on("click",".add-slide",function(){
    var $this = $(this);
    $("#optional_slides .slides .slide[data-id="+$this.data("slide-id")+"]").appendTo("#slides .slides");
    $this.removeClass("add-slide").addClass("remove-slide").html('<span class="glyphicon glyphicon-remove"></span> Remove Slide');
  }).on("click",".remove-slide",function(){
    var $this = $(this);
    $("#slides .slides .slide[data-id="+$this.data("slide-id")+"]").appendTo("#optional_slides .slides");
    $this.removeClass("remove-slide").addClass("add-slide").html('<span class="glyphicon glyphicon-plus"></span> Add Slide');
  });


  // thumbnail slizer
  $('#thumb_sizer').slider({
    "tooltip": "hide"
  }).on("slide",function(e){
    $(".slides .slide").css("width",e.value+"%");
  });

  // drag and drop slides
  $( "#slides, #optional_slides" ).sortable({
    connectWith:  ".slideDeck",
    items:        ".slide",
    remove:     function(event, ui){
      if( $(ui.item).hasClass("required") ) {
        $( "#slides" ).sortable( "cancel" );
      }
    }
  })/*.disableSelection().on("mouseover",".slide",function(){
    // show controls
    var $this = $(this),
        pos = $this.offset();
    console.log(pos);
    controls.css({
      "top":    pos.top,
      "left":   pos.left,
      "width":  $this.width(),
      "height":  $this.height()
    }).removeClass("hide");
  })*/;

  // search tags
  $("#optional_slides .search").on("keyup","input",function(){
    if($(this).val().length > 0){
      // add support for all optional slides checkbox .optional
      $("#optional_slides .slide:visible").addClass("hide");
      $('#optional_slides [data-tags *= "'+$(this).val()+'"]:hidden').removeClass("hide");
    }else{
      $("#optional_slides .slide:hidden").removeClass("hide");
    }
  }).on("click","#show_all_optonal", function(){
    if($(this).is(":checked")){
      $("#optional_slides .slide.optional").addClass("optional-show");
    }else{
      $("#optional_slides .slide.optional").removeClass("optional-show");
    }
  });

  // save custom deck
  $("#slide-header").on("submit","form",function(e){
    e.preventDefault;
    var title = $(this).find("input").val(),
        slides = serializeSlides("#slides .slides");
    console.log(slides);
    alert('Saved custom deck "'+title+'"\n\n (see console log for data)');
    return false;
  });


  //make preview resizable
  /*$( "#slide_preview" ).resizable({
    handles:  "e, w"
  });*/

});


function getDecks(){
  return $.getJSON("data/decks.json", function(data){
    $.data(storage, "_decks", data.decks);
  });
}
function getSlides(){
  return $.getJSON("data/slides.json", function(data){
    $.data(storage, "_slides", data.slides);
  });
}

function serializeSlides(container){
  return $(container).find(".slide").map(function(){
    return $(this).data("id");
  });
}

function refreshDeckSelector(){
  var items = [],
      _decks = $.data(storage, "_decks");
  $.each( _decks, function( i, item ) {
    items.push( $("<option/>",{
      "value":          item.id,
      "text":           item.name
    }));
  });
  // add to ui
  $(deckSelector).append(items).trigger("change");
}

function loadSlides(){
  var deckID = $(deckSelector).val(),
      slides = [],
      optional_slides = [],
      _slides = $.data(storage, "_slides"),
      _decks = $.data(storage, "_decks"),
      thisDeck = $.grep(_decks, function(element,index){
        return element.id == deckID
      })[0],
      slide_ids = [];

  // loop through this deck's slides
  $.each(thisDeck.slides, function(i, item){
    var slide = $.grep(_slides, function (element, index) {
        return element.id == item.id;
    })[0];
    slides.push( formatSlide(slide, item) );
    slide_ids.push(item.id)
  });


  // get remaining slides - WILL NEED TO CHANGE
  //                        Need another api call here to figure out all optional slides
  //                        that can exist that are not core slides or slides that exist
  //                        in this deck
  var items = $.grep(_slides, function (element, index) {
      return $.inArray(element.id, slide_ids) === -1;
  });
  // remove optional_slides
  /*var items = $.grep(items, function (element, index) {
      return $.inArray(element.id, thisDeck.optional_slides) === -1;
  });*/

  $.each(items, function(i, item){
    var options = [];
    if( $.inArray(item.id, thisDeck.optional_slides) === -1 ){
      options.optional = true;
    }else{

    }
    optional_slides.push( formatSlide(item, options) );
  });

  // add to ui
  $("#slides .slides").html( slides );
  $("#optional_slides .slides").html( optional_slides );
}

function formatSlide(data, options){
  var slide =   [],
      thumbs =  1,
      tags =    ($.isArray(data.tags) ? data.tags.join(",") : data.tags),
      classes = "slide",
      classes = classes + (options.required ? " required" : ""),
      classes = classes + (data.group ? " group" : ""),
      classes = classes + (options.optional ? " optional" : "");
  if(data.group){
    $.each(data.slides, function(i, s){
      slide.push( $("<img/>").attr({
        "src": s.thumbnail,
        "style": "z-index:"+i
      }) );
    });
    thumbs = data.slides.length;
  }else{
    slide.push( $("<img/>").attr("src", data.thumbnail) );
  }
  slide.push( $("<span/>").addClass("title").text(data.title) );
  slide.push( $("<span/>").addClass("desc").text(data.description) );
  return $("<div/>", {
          "data-tags":          tags,
          "data-thumbs":        thumbs,
          "data-thumbnail_lg":  data.thumbnail_lg,
          "data-id":            data.id,
          "class":              classes,
          "title":              data.title,
          "html":               slide,
          "group":              data.group || false
        });
}