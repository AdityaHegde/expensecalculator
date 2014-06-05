Expense = Ember.Application.create({
  rootElement : "#expense-calc",
});

var
attr = DS.attr;

Expense.Router.map(function() {
  this.resource('index', { path : '' }, function() {
    this.resource('outing', { path : 'outing/:outing_name' }, function() {
      this.route('person', { path : ':person_id' });
      this.route('event', { path : ':event_id' });
      this.route('report');
    });
    this.resource('user_summary', { path : 'user_summary' }, function() {
      this.route('outing_short', {path : ':outing_name' });
    });
  });
});

Ember.TextField.reopen({
  attributeBindings: ['autofocus']
});

Ember.Handlebars.registerBoundHelper('create-view', function(viewName, options) {
  return Ember.Handlebars.ViewHelper.helper(options.contexts[options.contexts.length - 1], viewName, options);
});

Ember.Handlebars.registerBoundHelper('get-name-by-id', function(id, array) {
  var record = array.findBy("id", id);
  return (record && record.get("name")) || "";
});

Expense.ApplicationAdapter = CrudAdapter.ApplicationAdapter;
Expense.ApplicationSerializer = CrudAdapter.ApplicationSerializer;
