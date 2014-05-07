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
