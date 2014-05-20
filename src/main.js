var EditCtx = {};
var fs = require('fs');
var path = require('path');

function init_cm_editor(textarea) {
  var cm = CodeMirror.fromTextArea(textarea, { 'lineNumbers': true, 'lineWrapping': true });
  cm.setSize("100%", "100%");  
  return cm;
}

function page_path(page_name) {
  return 'pages/' + page_name + '.md' 
}

function page_exists(page_name) {
  var file = page_path(page_name);
  return fs.existsSync(file);
}

function inject_wiki_handler(html) {
  var div = $(document.createElement('div'));
  div.html(html);
  div.find('a[href^=wiki\\:]').each(function(index, element) {
    var elem = $(element);
    var page = elem.attr('href');
    var page_name = page.substring(5);
    if (!page_exists(page_name)) {
      elem.attr("class", "nopage");
    }

    elem.attr('href', '#')
    elem.attr('onclick', 'on_wiki_link_click(\'' + page + '\'); return false;') 
  });
  return div.html();
}

function post_process_html(html) {
  html = inject_wiki_handler(html);
  return html;
}

function hide_toc_if_empty() {
  var show_toc_toc_class = 'col-md-3 col-xs-3';
  var show_toc_preview_class = 'col-md-9 col-xs-9';
  var hide_toc_toc_class = 'col-md-1 col-xs-1';
  var hide_toc_preview_class = 'col-md-10 col-xs-10';

  if ($("#toc").html() == "") {
    $("#toc_div").removeClass(show_toc_toc_class).addClass(hide_toc_toc_class);
    $("#preview_div").removeClass(show_toc_preview_class).addClass(hide_toc_preview_class);
  } else {
    $("#toc_div").removeClass(hide_toc_toc_class).addClass(show_toc_toc_class);
    $("#preview_div").removeClass(hide_toc_preview_class).addClass(show_toc_preview_class);
  }
}

function generate_toc() {
  var parent = $("#toc").parent();
  $("#toc").remove();
  parent.html('<div id="toc"></div>');
  $("#toc").tocify({'selectors': 'h1,h2,h3,h4,h5', 'showEffect': 'none', 'hideEffect': 'none' });
  hide_toc_if_empty();
}

function load_page(page_name) {
  var text = fs.readFileSync(page_path(page_name)).toString();
  var html = marked(text);

  html = post_process_html(html);

  EditCtx.preview_content.html(html);
  
  EditCtx.cm.setValue(text);
  EditCtx.cm.markClean();

  EditCtx.ph.push(page_name);       

  generate_toc();
}

function load_start_page() {
  load_page('start');
}

function change_to_edit_mode() {
  EditCtx.editor.show();
  EditCtx.preview.hide();
  EditCtx.cm.scrollTo(0, 0);
  EditCtx.mode = 'edit';
  EditCtx.editreadbtn.text('Save & Read');
  EditCtx.livepreview.show();
  render_live_preview();
  $("#livepreview").show();
  $("#insertimage").show();
  EditCtx.cm.focus();
}

function change_to_read_mode() {
  EditCtx.editor.hide();
  EditCtx.preview.show();
  EditCtx.editreadbtn.text('Edit');
  EditCtx.mode = 'read';
  EditCtx.livepreview.html("");
  EditCtx.livepreview.hide();
  $("#livepreview").hide();
  $("#insertimage").hide();
}

function create_new_page(page_name) {
  EditCtx.cm.setValue("");
  change_to_edit_mode();
  EditCtx.ph.push(page_name);
  EditCtx.cm.markClean();
}

function on_wiki_link_click(page) {
  var page_name = page.substring(5);
  if (page_exists(page_name)) {
    load_page(page_name);
    return;
  }
  create_new_page(page_name);
}

function save_modified() {
  if (EditCtx.cm.isClean()) {
    return false;
  }
  fs.writeFileSync(page_path(EditCtx.ph.current()), EditCtx.cm.getValue());
  EditCtx.cm.markClean();
  return true;
}

function render_editor() {
  var html = marked(EditCtx.cm.getValue());
  html = post_process_html(html);
  EditCtx.preview_content.html(html);  
}

function render_live_preview() {
  var html = marked(EditCtx.cm.getValue());
  html = post_process_html(html);
  EditCtx.livepreview.html(html);    
}

function install_edit_read_handler() {
  var btn = $("#editread");
  btn.on("click", function() {
    if (EditCtx.mode == 'read') {
      change_to_edit_mode();
    } else {
      change_to_read_mode();
      if (save_modified()) {
        render_editor();
        generate_toc();
      }
    }
    btn.blur();
  });  
}

function install_live_preview_handler() {
  var btn = $("#livepreview");
  var livepreview = true;
  btn.on("click", function() {
    if (btn.hasClass('active')) {
      btn.removeClass('active');
      livepreview = false;
    } else {
      btn.addClass('active');
      livepreview = true;
    }
    btn.blur();
  });

  EditCtx.cm.on("change", function(cm, obj) {
    if (livepreview && EditCtx.mode == 'edit') {
      render_live_preview();
    }
  });
}

function copyFile(source, target, cb) {
  var cbCalled = false;

  var rd = fs.createReadStream(source);
  rd.on("error", function(err) {
    done('error');
  });
  var wr = fs.createWriteStream(target);
  wr.on("error", function(err) {
    done('error');
  });
  wr.on("close", function(ex) {
    done(target);
  });
  rd.pipe(wr);

  function done(msg) {
    if (!cbCalled) {
      cb(msg);
      cbCalled = true;
    }
  }
}

function copy_image_file(srcfile, cb) {
  imagespath = path.dirname(window.location.pathname);
  if (imagespath[0] == '/') {
    imagespath = imagespath.substring(1);
  }
  imagespath = path.join(imagespath, 'images');
  if (srcfile.toLowerCase().indexOf(imagespath.toLowerCase()) >= 0) {
    console.log("no need to copy")
    cb(srcfile);
    return;
  }

  tgtfile = path.join(imagespath, path.basename(srcfile));

  if (fs.existsSync(tgtfile)) {
    alert('A file with the same name exists. Please browse the existing file or rename the new file.');
    return null;
  }

  copyFile(srcfile, tgtfile, cb);
}

function install_insert_image_handler() {
  var cm = EditCtx.cm;
  $('#insertimage').on('click', function() {
    var chooser = $('#fileDialog');
    chooser.on('change', function(evt) {
      console.log('file changed');
      copy_image_file($(this).val(), function(msg) {
        pos = cm.getCursor();
        cm.replaceRange('\n![](images/' + path.basename(msg) + ')\n', pos);
      });
      chooser.off('change');
    });

    chooser.trigger('click');  

    cm.focus();
  });
}

function install_search_handler() {
  $('#searchform').on('submit', function(e) {
    var sstr = $('#searchtext').val().trim();
    if (sstr.length == 0) {
      return;
    }
  })
}