Expense.GlobalData = Ember.Object.extend({
  selected_outing : "new",
  outings : [],
  userName : "anonymous",
  userMail : "",
  curOuting : null,
});
Expense.GlobalObj = Expense.GlobalData.create();

var attr = DS.attr, hasMany = DS.hasMany, belongsTo = DS.belongsTo;

Expense.Outing = DS.Model.extend(Utils.ObjectWithArrayMixin, {
  outing_name : attr(),

  arrayProps : ['people', 'events'],

  people : hasMany("person", {async : true}),
  peopleWillBeDeleted : function(person) {
    var events = this.get("events");
    for(var i = 0; i < events.length; i++) {
      var event = events.objectAt(i);
      event.personRemoved(person.get("name"));
    }
  },

  peopleWasAdded : function(person) {
    var events = this.get("events"),
        personEvts = person.get("personEvents");
    for(var i = 0; i < events.get("length"); i++) {
      var event = events.objectAt(i);
      if(!person.hasArrayProp("personEvents", "event.id", event.get("id"))) {
        var eventPerson = event.personAdded(person),
            personEvt = this.store.createRecord("person-event", {
              event : event,
              eventPerson : eventPerson,
              person : person,
            });
        personEvt.setupData({}, true);
        person.addTo_personEvents(personEvt);
      }
    }
  },

  events : hasMany("event", {async : true}),

  eventsWillBeDeleted : function(event) {
    var people = this.get("people");
    for(var i = 0; i < people.get("length"); i++) {
      var person = people.objectAt(i),
          personEvents = person.get("events"),
          personEvent = personEvents.findBy("eventObj", event);
      if(personEvent) personEvents.removeObject(personEvent);
    }
  },

  eventsWasAdded : function(event) {
    var people = this.get("people"),
        eventPeople = event.get("eventPeople"),
        notEventPeople = event.get("notEventPeople");
    for(var i = 0; i < people.get("length"); i++) {
      var person = people.objectAt(i);
      if(!eventPeople.findBy("person.id", person.get("id")) && !notEventPeople.findBy("person.id", person.get("id"))) {
        var eventPerson = event.personAdded(person),
            personEvt = this.store.createRecord("person-event", {
              event : event,
              eventPerson : eventPerson,
              person : person,
            });
        personEvt.setupData({}, true);
        person.addTo_personEvents(personEvt);
      }
    }
  },

  totalAmt : function() {
    var events = this.get("events");
    return events.reduce(function(s, e, i, a) {
      return s + Number(e.get("amt"));
    }, 0);
  }.property('events.@each.amt'),

  amtPaid : function() {
    var events = this.get("events");
    return events.reduce(function(s, e, i, a) {
      return s + Number(e.get("amtPaid") || 0);
    }, 0);
  }.property('events.@each.amtPaid'),

  amtRemained : function() {
    return Number(this.get("totalAmt")) - Number(this.get("amtPaid"));
  }.property('amtPaid'),
});
Expense.Outing.keys = ['id'];
Expense.Outing.apiName = 'outing';
Expense.Outing.queryParams = ['id'];
Expense.Outing.findParams = [];
Expense.Outing.retainId = true;

Expense.PersonEvent = DS.Model.extend({
  init : function() {
    this._super();
    this.get("toPay");
    this.get("paid");
  },

  event : null,
  eventPerson : null,
  person : belongsTo("person"),
  toPay : Ember.computed.alias("eventPerson.toPay"),
  paid : Ember.computed.alias("eventPerson.paid"),
});
Expense.PersonEvent.keys = ['event', 'person'];
Expense.PersonEvent.apiName = 'personEvent';
Expense.PersonEvent.queryParams = ['event', 'person'];
Expense.PersonEvent.findParams = [];

Expense.Person = DS.Model.extend(Utils.DelayedAddToHasMany, {
  name : attr(),

  outing : belongsTo("outing"),

  owes : attr('number', {"default" : 0}),
  owed : attr('number', {"default" : 0}),

  owesOwedHasToChange : function() {
    var events = this.get("personEvents");
        toPay = events.reduce(function(s, e, i, a) {
          var toPay = e.get("toPay");
          if(toPay) return s + Number(toPay);
          return s;
        }, 0),
        paid = events.reduce(function(s, e, i, a) {
          var paid = e.get("paid");
          if(paid) return s + Number(paid);
          return s;
        }, 0),
        diff = toPay - paid;
    this.set("owes", (diff > 0 ? diff : 0));
    this.set("owed", (diff < 0 ? -diff : 0));
  }.observes('personEvents.@each.toPay', 'personEvents.@each.paid'),

  personEvents : hasMany("person-event", {async : true}),
  arrayProps : ['personEvents'],
});
Expense.Person.keys = ['id'];
Expense.Person.apiName = 'person';
Expense.Person.queryParams = ['id'];
Expense.Person.findParams = [];
Expense.Person.retainId = true;

Expense.EventPerson = DS.Model.extend({
  person : null,
  name : Ember.computed.alias('person.name'),
  toPay : attr('number', {"default" : 0}),
  paid : attr('number', {"default" : 0}),
  event : belongsTo("event"),
});
Expense.EventPerson.keys = ['event', 'person'];
Expense.EventPerson.apiName = 'eventPerson';
Expense.EventPerson.queryParams = ['event', 'person'];
Expense.EventPerson.findParams = [];

Expense.Event = DS.Model.extend({
  init : function() {
    this._super();
    this.set("notEventPeople", []);
  },

  name : attr(),
  amt : attr('number', {"default" : 0}),

  outing : belongsTo("outing"),

  eventPeople : hasMany("event-person", {async : true}),
  notEventPeople : [],

  personRemoved : function(name) {
    var eventPeople = this.get("eventPeople"), notEventPeople = this.get("notEventPeople"),
        isInEvt = eventPeople.findBy("name", name), isNotInEvt = notEventPeople.findBy("name", name);
    if(isInEvt) {
      eventPeople.removeObject(isInEvt);
      isInEvt.setupData({}, true);
      isInEvt.unloadRecord();
      return isInEvt;
    }
    else if(isNotInEvt) {
      notEventPeople.removeObject(isNotInEvt)
      isNotInEvt.setupData({}, true);
      isNotInEvt.unloadRecord();
      return isNotInEvt;
    }
  },

  personAdded : function(personObj) {
    var notEventPeople = this.get("notEventPeople"),
        id = this.get("id"),
        evtPerson = this.store.createRecord("event-person", {
          person : personObj,
          event : this,
          toPay : 0,
          paid : 0,
        });
    evtPerson.setupData({}, true);
    notEventPeople.pushObject(evtPerson);
    return evtPerson;
  },

  amtPaid : function() {
    var eventPeople = this.get("eventPeople");
    return eventPeople.reduce(function(s, e, i, a) {
      return s + Number(e.get("paid"));
    }, 0);
  }.property('eventPeople.@each.paid'),

  amtRemained : function() {
    return Number(this.get("amt")) - Number(this.get("amtPaid"));
  }.property('amtPaid'),

  updateShare : function() {
    var uninvolved = this.get("notEventPeople"),
        involved = this.get("eventPeople"),
        amt = Number(this.get("amt"));
    uninvolved.forEach(function(e, i, a) {
      e.set("toPay", 0);
    });
    involved.forEach(function(e, i, a) {
      e.set("toPay", amt / involved.get("length"));
    });
  }.observes('eventPeople.@each', 'amt'),
});
Expense.Event.keys = ['id'];
Expense.Event.apiName = 'event';
Expense.Event.queryParams = ['id'];
Expense.Event.findParams = [];
Expense.Event.retainId = true;

Expense.PersonFinal = Ember.Object.extend(Utils.ObjectWithArrayMixin, {
  id : "",
  arrayProps : ['toPay', 'toRecieve'],
  toPay : null,
  toPayCanAdd : function(addedObj) {
    var toPay = this.get("toPay"), toRecieve = this.get("toRecieve"),
        existingToPay = toPay.findBy("id", addedObj.get("id")),
        existingToRecieve = toRecieve.findBy("id", addedObj.get("id"));
    if(existingToPay && existingToPay !== addedObj) {
      existingToPay.set("amt", existingToPay.get("amt") + addedObj.get("amt"));
      return false;
    }
    else if(existingToRecieve) {
      var diff = addedObj.get("amt") - existingToRecieve.get("amt");
      if(diff > 0) {
        addedObj.set("amt", diff);
        toRecieve.removeObject(existingToRecieve);
      }
      else if(diff < 0) {
        existingToRecieve.set("amt", -diff);
        return false;
      }
      else {
        toRecieve.removeObject(existingToRecieve);
        return false;
      }
    }
    return true;
  },
  toRecieve : null,
  toRecieveCanAdd : function(addedObj) {
    var toPay = this.get("toPay"), toRecieve = this.get("toRecieve"),
        existingToPay = toPay.findBy("id", addedObj.get("id")),
        existingToRecieve = toRecieve.findBy("id", addedObj.get("id"));
    if(existingToRecieve && existingToRecieve !== addedObj) {
      existingToRecieve.set("amt", existingToRecieve.get("amt") + addedObj.get("amt"));
      return false;
    }
    else if(existingToPay) {
      var diff = addedObj.get("amt") - existingToPay.get("amt");
      if(diff > 0) {
        addedObj.set("amt", diff);
        toPay.removeObject(existingToPay);
      }
      else if(diff < 0) {
        existingToPay.set("amt", -diff);
        return false;
      }
      else {
        toPay.removeObject(existingToPay);
        return false;
      }
    }
    return true;
  },
  owes : 0,
  owed : 0,
});

Expense.PersonBalanceFinal = Ember.Object.extend({
  id : "",
  amt : 0,
});

Expense.ReportObject = Ember.Object.extend({
  outing : null,

  name : "",
  owes : 0,
  owed : 0,
  people : function(key, value) {
    if(arguments.length > 1) {
      var retval = [];
      if(value) {
        value.forEach(function(item) {
          this.push(Expense.PersonFinal.create({
            id : item.get("id"),
            owes : item.get("owes"),
            owed : item.get("owed"),
          }));
        }, retval);
        this.updateShare(retval);
      }
      return retval;
    }
  }.property(),

  addPersonBalance : function(arrObj, id, amt) {
    arrObj.pushObject(Expense.PersonBalanceFinal.create({
      id : id,
      amt : amt,
    }));
  },

  updateShare : function(people) {
    var owedStack = [],
        owesStack = [],
        that = this;
    people.forEach(function(e, i, a) {
      if(e.get("owes") > 0) {
        while(owedStack.length > 0 && e.get("owes") > 0) {
          var remains = owedStack[0].get("owed") - e.get("owes");
          if(remains > 0) {
            that.addPersonBalance(owedStack[0].get("toRecieve"), e.get("id"), e.get("owes"));
            that.addPersonBalance(e.get("toPay"), owedStack[0].get("id"), e.get("owes"));
            e.set("owes", 0);
          }
          else {
            that.addPersonBalance(owedStack[0].get("toRecieve"), e.get("id"), owedStack[0].get("owed"));
            that.addPersonBalance(e.get("toPay"), owedStack[0].get("id"), owedStack[0].get("owed"));
            e.set("owes", e.get("owes") - owedStack[0].get("owed"));
            owedStack[0].set("owed", 0);
            owedStack.shift();
          }
        }
        if(e.get("owes") > 0) owesStack.pushObject(e);
      }
      else if(e.get("owed") > 0) {
        while(owesStack.length > 0 && e.get("owed") > 0) {
          var remains = owesStack[0].get("owes") - e.get("owed");
          if(remains > 0) {
            that.addPersonBalance(owesStack[0].get("toPay"), e.get("id"), e.get("owes"));
            that.addPersonBalance(e.get("toRecieve"), owesStack[0].get("id"), e.get("owes"));
            e.set("owed", 0);
          }
          else {
            that.addPersonBalance(owesStack[0].get("toPay"), e.get("id"), owesStack[0].get("owes"));
            that.addPersonBalance(e.get("toRecieve"), owesStack[0].get("id"), owesStack[0].get("owes"));
            e.set("owed", e.get("owed") - owesStack[0].get("owes"));
            owesStack[0].set("owes", 0);
            owesStack.shift();
          }
        }
        if(e.get("owed") > 0) owedStack.pushObject(e);
      }
    });
  },
});
