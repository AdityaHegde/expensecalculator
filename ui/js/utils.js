function XHR(config) {
  this.method = config.method || "POST";
  this.url = config.url;
  this.params = config.params;
  this.async = true;
  this.callback = config.callback;
}

XHR.prototype.send = function() {
  var xmlhttp = new XMLHttpRequest(), that = this;
  if(this.callback) {
    xmlhttp.onreadystatechange = function () {
      if (xmlhttp.readyState == 4) {
        that.callback(xmlhttp.responseText);
      }
    };
  }
  xmlhttp.open(this.method, this.url, this.async);
  xmlhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
  xmlhttp.send(this.params);
};
