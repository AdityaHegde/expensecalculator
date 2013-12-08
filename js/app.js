Expense = Ember.Application.create();

var
attr = DS.attr;

Expense.Router.map(function() {
  this.resource('index', { path : '' }, function() {
    this.resource('bill', { path: ':bill_id' });
    this.resource('person', { path: ':person_id' });
  });
});

