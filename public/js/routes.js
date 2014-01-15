Expense.RedirectRoute = Ember.Route.extend({
  model : function(params, transition) {
    this.transitionTo("index", {outing_name : "new"});
    return {};
  },
});

Expense.IndexRoute = Ember.Route.extend({
  setupController : function(controller, model) {
    controller.set("model", data);
    if(model.outing_name && model.outing_name !== "new") {
      $.ajax({
        url : window.location.origin+"/data?outingName="+model.outing_name,
      }).done(function(loaddata) {
        data.set('people', loaddata.people);
        data.set('events', loaddata.events);
        data.set('outingName', model.outing_name);
        controller.transitionToRoute('report');
      });
    }
    else {
      controller.transitionToRoute('people');
    }
  },
});

Expense.PeopleRoute = Ember.Route.extend({
  model : function() {
    return data.get("people");
  },
});

Expense.PersonRoute = Ember.Route.extend({
  model : function(params) {
    var model = data.get("people").findBy('id', params.person_id);
    if(model) return model;
    else this.transitionTo('');
  },
});

Expense.EventsRoute = Ember.Route.extend({
  model : function() {
    return data.get("events");
  },
});

Expense.EventRoute = Ember.Route.extend({
  model : function(params) {
    var model = data.get("events").findBy('id', params.event_id);
    if(model) return model;
    else this.transitionTo('');
  },
});

Expense.ReportRoute = Ember.Route.extend({
  model : function(params) {
    return Expense.ReportObject.create({peopleObjs : data.get("people"), name : data.outingName});
  },
});
