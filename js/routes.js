Expense.IndexRoute = Ember.Route.extend({
  model : function() {
    return data;
  },
});

Expense.PersonRoute = Ember.Route.extend({
  model : function(params) {
    return data.people.findBy('id', params.person_id);
  },
});

Expense.BillRoute = Ember.Route.extend({
  model : function(params) {
    return data.bills.findBy('id', params.bill_id);
  },
});
