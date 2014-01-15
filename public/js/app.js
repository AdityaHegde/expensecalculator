Expense = Ember.Application.create();

var
attr = DS.attr;

Expense.Router.map(function() {
  this.resource('index', { path : ':outing_name' }, function() {
    this.resource('events', { path : 'events' }, function() {
      this.resource('event', { path : ':event_id' });
    });
    this.resource('people', { path : 'people' }, function() {
      this.resource('person', { path : ':person_id' });
    });
    this.resource('report');
  });
  this.resource('redirect', { path : '' });
});
