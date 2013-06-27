var child = require('child_process');
var dashboard;
exports.registerDashboard = function(dashboard_) {
  dashboard = dashboard_;
}

exports.html = function(htmlCode) {
  dashboard.html(htmlCode);
}
exports.widget = function(javascriptCode) {
  dashboard.widget(javascriptCode);
}
exports.install = function(pkg) {
  child.spawn("npm", ["install", pkg]);
};