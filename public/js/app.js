Expense = Ember.Application.create();

var
attr = DS.attr;

Expense.Router.map(function() {
  this.resource('index', { path : '' }, function() {
    this.resource('calc', { path : 'calc/:calc_name' }, function() {
      this.resource('bill', { path : 'bill/:bill_id' });
      this.resource('person', { path : 'person/:person_id' });
      this.resource('report');
    });
    this.resource('test');
  });
});
