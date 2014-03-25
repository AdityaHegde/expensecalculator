Expense = Ember.Application.create({
  rootElement : "#expense-calc",
});

var
attr = DS.attr;

Expense.Router.map(function() {
  this.resource('outing', { path : ':outing_name' }, function() {
    this.resource('people', { path : 'people' }, function() {
      this.route('person', { path : ':person_id' });
    });
    this.resource('events', { path : 'events' }, function() {
      this.route('event', { path : ':event_id' });
    });
    this.route('report');
  });
});

Ember.TextField.reopen({
  attributeBindings: ['autofocus']
});
