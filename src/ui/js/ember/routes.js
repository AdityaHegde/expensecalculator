Expense.IndexRoute = Ember.Route.extend({
  model : function(params, transtion) {
    return new Ember.RSVP.Promise(function(resolve, reject) {
      $.ajax({url : "/page_data", dataType : "json"}).done(function(retdata) {
        if(retdata.status === "0") {
          Expense.GlobalObj = Expense.GlobalData.create(retdata.data);
          resolve(Expense.GlobalObj);
        }
        else {
          reject(retdata.message);
        }
      }).fail(function(message) {
        //reject(message);
        resolve(Expense.BaseObject.create({userName : "aditya"}));
      });
    });
  },
});

Expense.OutingRoute = Ember.Route.extend({
  model : function(params, transition) {
    var curOuting = Ember.get("Expense.GlobalObj.curOutingOuting");
    if(params.outing_id && params.outing_id !== "new" && curOuting.get("id") != params.outing_id) {
      return this.store.find("outing", params.outing_id);
    }
    else if(curOuting && curOuting.get("id") == params.outing_id) {
      return curOuting;
    }
    else {
      return this.store.createRecord("outing", {outing_name : "new"});
    }
  },

  afterModel : function(model, transition) {
    Ember.set("Expense.GlobalObj.curOuting", model);
  },
});

Expense.OutingPersonRoute = Ember.Route.extend({
  model : function(params, transition) {
    var model = Ember.get("Expense.GlobalObj.curOuting.people").findBy('id', params.person_id);
    if(model) return model;
    else this.transitionTo('outing', Ember.get("Expense.GlobalObj.curOuting.id"));
  },
});

Expense.OutingEventRoute = Ember.Route.extend({
  model : function(params, transition) {
    var model = Ember.get("Expense.GlobalObj.curOuting.events").findBy('id', params.event_id);
    if(model) return model;
    else this.transitionTo('outing', Ember.get("Expense.GlobalObj.curOuting.id"));
  },
});

Expense.OutingReportRoute = Ember.Route.extend({
  model : function(params) {
    return Expense.ReportObject.create({people : Ember.get("Expense.GlobalObj.curOuting.people"), name : Ember.get("Expense.GlobalObj.curOuting.id")});
  },
});
