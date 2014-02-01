Expense.IndexRoute = Ember.Route.extend({
  model : function(params, transtion) {
    this.transitionTo('outing', 'new');
  },
});

Expense.OutingRoute = Ember.Route.extend({
  model : function(params, transition) {
    if(params.outing_name && params.outing_name !== "new" && data.get("outing_name") != params.outing_name) {
      return Ember.RSVP.Promise(function(resolve, reject) {
        $.ajax({url : window.location.origin+"/data?outingName="+params.outing_name}).done(function(retdata) {
          data.set('people', retdata.people);
          data.set('events', retdata.events);
          data.set('outing_name', params.outing_name);
          resolve(data);
        }).fail(function(message) {
          reject(message);
        })
      });
    }
    else {
      return data;
    }
  },
});

Expense.PeopleRoute = Ember.Route.extend({
  model : function(params, transition) {
    return data.get("people");
  },
});

Expense.PeoplePersonRoute = Ember.Route.extend({
  model : function(params, transition) {
    var model = data.get("people").findBy('id', params.person_id);
    if(model) return model;
    else this.transitionTo('people');
  },
});

Expense.EventsRoute = Ember.Route.extend({
  model : function(params, transition) {
    return data.get("events");
  },
});

Expense.EventsEventRoute = Ember.Route.extend({
  model : function(params, transition) {
    var model = data.get("events").findBy('id', params.event_id);
    if(model) return model;
    else this.transitionTo('events');
  },
});

Expense.OutingReportRoute = Ember.Route.extend({
  model : function(params) {
    return Expense.ReportObject.create({peopleObjs : data.get("people"), name : data.outingName});
  },
});
