Expense.OutingController = Ember.Controller.extend({
  addingPerson : false,
  newPerson : null,
  addingEvent : false,
  newEvent : null,

  totalAmt : function() {
    var events = this.get("model").get("events");
    return events.reduce(function(s, e, i, a) {
      return s + Number(e.amt);
    }, 0);
  }.property('model.events.@each.amt'),

  amtPaid : function() {
    var events = this.get("model").get("events");
    return events.reduce(function(s, e, i, a) {
      return s + Number(e.get("amtPaid") || 0);
    }, 0);
  }.property('model.events.@each.amtPaid'),

  amtRemained : function() {
    return Number(this.get("totalAmt")) - Number(this.get("amtPaid"));
  }.property('amtPaid'),

  actions : {
    addPerson : function() {
      var people = this.get("model").get("people"),
          newPerson = Expense.Person.create({id : people.get("length")+"", events : []});
      this.set("newPerson", newPerson);
      this.set("addingPerson", true);
      people.pushObject(newPerson);
    },

    savePerson : function() {
      this.set("addingPerson", false);
      this.transitionToRoute('outing.person', this.get("newPerson").id);
    },

    cancelEditPerson : function() {
      var people = this.get("people").get("people"), newPerson = this.get("newPerson");
      people.removeObject(newPerson);
      this.set("addingPerson", false);
    },

    addEvent : function() {
      var events = this.get("model").get("events"),
          newEvent = Expense.Event.create({id : events.get("length")+"", peopleAttended : [], amt : 0});
      this.set("newEvent", newEvent);
      this.set("addingEvent", true);
      events.pushObject(newEvent);
    },

    saveEvent : function() {
      this.set("addingEvent", false);
      this.transitionToRoute('outing.event', this.get("newEvent").id);
    },

    cancelEditEvent : function() {
      var events = this.get("events").get("events"), newEvent = this.get("newEvent");
      events.removeObject(newEvent);
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
      var peopleAttended = this.get("model").get("peopleAttended"),
          peopleNotAttended = this.get("model").get("peopleNotAttended");
      peopleAttended.removeObject(person);
      peopleNotAttended.addObject(person);
    },

    addPerson : function(person) {
      var peopleAttended = this.get("model").get("peopleAttended"),
          peopleNotAttended = this.get("model").get("peopleNotAttended");
      peopleAttended.addObject(person);
      peopleNotAttended.removeObject(person);
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
      for(var i = 0; i < postData.events.length; i++) {
        var event = dataobj.events.findBy('id', postData.events[i].id), peopleAttended = event.get("peopleAttended");
        delete postData.events[i].data;
        postData.events[i].peopleAttended = JSON.parse(JSON.stringify(peopleAttended));
        for(var j = 0; j < postData.events[i].peopleAttended.length; j++) {
          postData.events[i].peopleAttended[j].name = peopleAttended[j].get("name");
          delete postData.events[i].peopleAttended[j].eventObj;
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
