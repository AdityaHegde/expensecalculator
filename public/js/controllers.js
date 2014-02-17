Expense.PeopleController = Ember.ArrayController.extend({
  addingPerson : false,
  newPerson : null,

  actions : {
    addPerson : function() {
      var model = this.get("model"),
          newPerson = Expense.Person.create({id : model.get("length")+"", events : []});
      this.set("newPerson", newPerson);
      this.set("addingPerson", true);
      model.pushObject(newPerson);
    },

    savePerson : function() {
      this.set("addingPerson", false);
      this.transitionToRoute('people.person', this.get("newPerson").id);
    },

    cancelEditPerson : function() {
      var model = this.get("model");
      model.removeAt(model.length - 1);
      this.set("addingPerson", false);
    },
  },
});

Expense.PeoplePersonController = Ember.Controller.extend({
});

Expense.EventsController = Ember.ArrayController.extend({
  addingEvent : false,
  newEvent : null,

  totalAmt : function() {
    var events = this.get("model");
    return events.reduce(function(s, e, i, a) {
      return s + Number(e.amt);
    }, 0);
  }.property('model.@each.amt'),

  amtPaid : function() {
    var events = this.get("model");
    return events.reduce(function(s, e, i, a) {
      return s + Number(e.get("amtPaid") || 0);
    }, 0);
  }.property('model.@each.amtPaid'),

  amtRemained : function() {
    return Number(this.get("totalAmt")) - Number(this.get("amtPaid"));
  }.property('amtPaid'),

  actions : {
    addEvent : function() {
      var model = this.get("model"),
          newEvent = Expense.Event.create({id : model.get("length")+"", peopleAttended : [], amt : 0});
      this.set("newEvent", newEvent);
      this.set("addingEvent", true);
      model.addObject(newEvent);
    },

    saveEvent : function() {
      this.set("addingEvent", false);
      this.transitionToRoute('events.event', this.get("newEvent").id);
    },

    cancelEditEvent : function() {
      var model = this.get("model");
      model.removeAt(model.length - 1);
      this.set("addingEvent", false);
    },
  },
});

Expense.EventsEventController = Ember.Controller.extend({
  isEditingAmt : false,

  actions : {
    editAmt : function() {
      this.set("isEditingAmt", true);
    },

    doneEditingAmt : function() {
      this.set("isEditingAmt", false);
    },

    removePerson : function(person) {
      var involved = this.get("model").get("peopleAttended"),
          personEvents = person.get("personObj").get("events");
      personEvents.removeObject(personEvents.findBy('eventId', this.get("model").get("id")));
      involved.removeObject(person);
    },

    addPerson : function(person) {
      var involved = this.get("model").get("peopleAttended");
      person.get("personObj").get("events").addObject(Expense.PersonEvent.create({
        eventId : this.get("model").get("id"),
        owes : 0,
        owed : 0,
      }));
      involved.addObject(person);
    },
  },
});

Expense.OutingReportController = Ember.Controller.extend({
  reportLink : "",

  actions : {
    saveOuting : function() {
      var dataobj = data.getProperties('people', 'events', 'outingName'),
          postData = JSON.parse(JSON.stringify(dataobj)),
          that = this, name = this.get("model").name;
      for(var i = 0; i < postData.people.length; i++) {
        var person = dataobj.people.findBy('id', postData.people[i].id);
        postData.people[i].events = person.get("events");
      }
      for(var i = 0; i < postData.events.length; i++) {
        var event = dataobj.events.findBy('id', postData.events[i].id), peopleAttended = event.get("peopleAttended");
        delete postData.events[i].data;
        postData.events[i].peopleAttended = JSON.parse(JSON.stringify(peopleAttended));
        for(var j = 0; j < postData.events[i].peopleAttended.length; j++) {
          postData.events[i].peopleAttended[j].name = peopleAttended[j].get("name");
          delete postData.events[i].peopleAttended[j].personObj;
        }
      }
      postData.outingName = name;
      console.log(JSON.stringify(postData));
      $.ajax({
        url : window.location.origin+"/data",
        method : "POST",
        data : { outingData : JSON.stringify(postData) },
      }).done(function(retData) {
        that.set("reportLink", window.location.origin+"/#/"+name);
        data.set("outingName", name);
      });
    },
  },
});
