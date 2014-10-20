Expense.OutingController = Ember.Controller.extend({
  addingPerson : false,
  newPerson : null,
  addingEvent : false,
  newEvent : null,

  totalAmt : function() {
    var events = this.get("model.events");
    return events.reduce(function(s, e, i, a) {
      return s + Number(e.amt);
    }, 0);
  }.property('model.events.@each.amt'),

  amtPaid : function() {
    var events = this.get("model.events");
    return events.reduce(function(s, e, i, a) {
      return s + Number(e.get("amtPaid") || 0);
    }, 0);
  }.property('model.events.@each.amtPaid'),

  amtRemained : function() {
    return Number(this.get("totalAmt")) - Number(this.get("amtPaid"));
  }.property('amtPaid'),

  actions : {
    addPerson : function() {
      var people = this.get("model.people"),
          newPerson = this.store.createRecord("person", {events : [], id : people.get("length")});
      this.set("newPerson", newPerson);
      this.set("addingPerson", true);
      //people.pushObject(newPerson);
    },

    savePerson : function() {
      var newPerson = this.get("newPerson"),
          people = this.get("model.people"),
          that = this;
      //CrudAdapter.saveRecord(newPerson).then(function(newPerson) {
        people.pushObject(newPerson);
        that.set("addingPerson", false);
        that.transitionToRoute('outing.person', newPerson.id);
      //});
    },

    cancelEditPerson : function() {
      var people = this.get("model.people"), newPerson = this.get("newPerson");
      people.removeObject(newPerson);
      //newPerson.unloadRecord();
      this.set("addingPerson", false);
    },

    addEvent : function() {
      var events = this.get("model.events"),
          newEvent = this.store.createRecord("event", {amt : 0, id : events.get("length")});
      this.set("newEvent", newEvent);
      this.set("addingEvent", true);
      //events.pushObject(newEvent);
    },

    saveEvent : function() {
      var newEvent = this.get("newEvent"),
          events = this.get("model.events"),
          that = this;
      //CrudAdapter.saveRecord(newEvent).then(function(newEvent) {
        events.pushObject(newEvent);
        that.set("addingEvent", false);
        that.transitionToRoute('outing.event', newEvent.id);
      //});
    },

    cancelEditEvent : function() {
      var events = this.get("model.events"), newEvent = this.get("newEvent");
      events.removeObject(newEvent);
      //newEvent.unloadRecord();
      this.set("addingEvent", false);
    },
  },
});

Expense.OutingEventController = Ember.Controller.extend({
  isEditingAmt : false,

  actions : {
    editAmt : function() {
      this.set("isEditingAmt", true);
    },

    doneEditingAmt : function() {
      this.set("isEditingAmt", false);
    },

    removePerson : function(person) {
      var eventPeople = this.get("model.eventPeople"),
          notEventPeople = this.get("model.notEventPeople");
      eventPeople.removeObject(person);
      notEventPeople.addObject(person);
    },

    addPerson : function(person) {
      var eventPeople = this.get("model.eventPeople"),
          notEventPeople = this.get("model.notEventPeople");
      eventPeople.addObject(person);
      notEventPeople.removeObject(person);
    },
  },
});

Expense.OutingReportController = Ember.Controller.extend({
  reportLink : "",

  actions : {
    saveOuting : function() {
      var curOuting = Ember.get("Expense.GlobalObj.curOuting");
      if(curOuting) {
        CrudAdapter.saveRecord(curOuting);
      }
    },
  },
});
