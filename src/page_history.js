function PageHistory(ph_div) {
  this.ph_div = ph_div;
  this.pages = [];
}

PageHistory.prototype.update = function() {
  var html = "";
  this.ph_div.html("");
  for (var i = 0; i < this.pages.length - 1; ++i) {
    var page = this.pages[i];
    html += '<li><a href="#" onclick="on_wiki_link_click(\'wiki:' + page + '\'); return false;">' + page + '</a></li>';
  }
  html += '<li class="active">' + this.pages[this.pages.length - 1] + '</li>';
  this.ph_div.html(html);
}

PageHistory.prototype.push = function(page) {
  var pages = [];
  this.pages.map(function(item) {
    if (item != page) {
      pages.push(item);
    }
  });
  pages.push(page);
  if (pages.length > 6) {
    pages.shift();
  }
  this.pages = pages;
  this.update();
}

PageHistory.prototype.current = function() {
  return this.pages[this.pages.length - 1];
}