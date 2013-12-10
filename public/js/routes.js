Expense.IndexRoute = Ember.Route.extend({
  model: function(queryParams, transition) {
    //this.transitionTo('calc', {calc_name : "new"});
    if(!transition.params.calc_name || transition.params.calc_name === "new") {
      data.calc_name = "new";
      this.transitionTo('calc', data);
    }
    return data;
  }
});

Expense.PersonRoute = Ember.Route.extend({
  model : function(params) {
    var model = data.people.findBy('id', params.person_id);
    if(model) return model;
    else this.transitionTo('');
  },
});

Expense.BillRoute = Ember.Route.extend({
  model : function(params) {
    var model = data.bills.findBy('id', params.bill_id);
    if(model) return model;
    else this.transitionTo('');
  },
});

Expense.ReportRoute = Ember.Route.extend({
  model : function(params) {
    return report;
  },
});

Expense.CalcRoute = Ember.Route.extend({
  setupController : function(controller, model) {
    if(model.calc_name && model.calc_name !== "new") {
      new XHR({
        url : window.location.origin+"/data?reportName="+model.report_name,
        method : "GET",
        callback : function(loaddata) {
          loaddata = JSON.parse(loaddata).result;
          for(var i = 0; i < loaddata.people.length; i++) {
            var personBillData = loaddata.people[i].bills;
            loaddata.people[i].bills = [];
            for(var j = 0; j < personBillData.length; j++) {
              loaddata.people[i].bills.addObject(Expense.PersonBill.create(personBillData[j]));
            }
            data.people.addObject(Expense.Person.create(loaddata.people[i]));
          }
          for(var i = 0; i < loaddata.bills.length; i++) {
            var peopleInvolved = loaddata.bills[i].peopleInvolved;
            loaddata.bills[i].peopleInvolved = [];
            loaddata.bills[i].peopleUninvolved = [];
            data.bills.addObject(Expense.Bill.create(loaddata.bills[i]));
            for(var j = 0; j < peopleInvolved.length; j++) {
              peopleInvolved[j].personObj = data.people.findBy('name', peopleInvolved[j].name);
              data.bills[i].peopleInvolved.addObject(Expense.PersonInvolved.create(peopleInvolved[j]));
            }
          }
          report.set("data", data);
        },
      }).send();
    }
    else {
      report.set("data", data);
    }
    controller.set("model", data);
  },
});
