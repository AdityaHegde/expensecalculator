Expense.IndexRoute = Ember.Route.extend({
  model : function(params, transtion) {
    return Ember.RSVP.Promise(function(resolve, reject) {
      $.ajax({url : "/page_data", dataType : "json"}).done(function(retdata) {
        if(retdata.status === "0") {
          resolve(Expense.BaseObject.create(retdata.data));
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
    if(params.outing_name && params.outing_name !== "new" && data.get("outing_name") != params.outing_name) {
      return Ember.RSVP.Promise(function(resolve, reject) {
        $.ajax({url : window.location.origin+"/data?outingName="+params.outing_name}).done(function(retdata) {
          if(retdata.status === "0") {
            retdata = retdata.data;
            data.set('people', retdata.people);
            data.set('events', retdata.events);
            data.set('outing_name', params.outing_name);
            resolve(data);
          }
          else {
            reject(retdata.message);
          }
        }).fail(function(message) {
          reject(message);
        })
      });
    }
    else {
      return data;
    }
  },

  afterModel : function(model, transition) {
   /*if(transition.targetName === 'outing.index') {
     this.transitionTo('people');
   }*/
  },
});

Expense.OutingPersonRoute = Ember.Route.extend({
  model : function(params, transition) {
    var model = data.get("people").findBy('id', params.person_id);
    if(model) return model;
    else this.transitionTo('outing', data.get("outing_name"));
  },
});

Expense.OutingEventRoute = Ember.Route.extend({
  model : function(params, transition) {
    var model = data.get("events").findBy('id', params.event_id);
    if(model) return model;
    else this.transitionTo('outing', data.get("outing_name"));
  },
});

Expense.OutingReportRoute = Ember.Route.extend({
  model : function(params) {
    return Expense.ReportObject.create({people : data.get("people"), name : data.get("outing_name")});
  },
});
