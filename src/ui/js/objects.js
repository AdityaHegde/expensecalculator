Expense.BaseObject = Ember.Object.extend({
  selected_outing : "new",
  outings : [],
  userName : "anonymous",
  userMail : "",
});

Expense.DataObject = Utils.ObjectWithArray.extend({
  outing_name : "new",

  arrayProps : ['people', 'events'],

  people : Utils.hasMany('Expense.Person'),
  peopleWillBeDeleted : function(person) {
    var events = this.get("events");
    for(var i = 0; i < events.length; i++) {
      events[i].personRemoved(person.get("name"));
    }
  },

  peopleWasAdded : function(person) {
    var events = this.get("events");
    for(var i = 0; i < events.length; i++) {
      var attendedObj = events[i].personAdded(person),
          personEvt = Expense.PersonEvent.create({
            eventObj : events[i],
            attendedObj : attendedObj,
            personObj : person,
          });
      person.get("events").pushObject(personEvt);
    }
  },

  events : Utils.hasMany('Expense.Event'),

  eventsWillBeDeleted : function(event) {
    var people = this.get("people");
    for(var i = 0; i < people.length; i++) {
      var personEvents = people[i].get("events"),
          personEvent = personEvents.findBy("eventObj", event);
      if(personEvent) personEvents.removeObject(personEvent);
    }
  },

  eventsWasAdded : function(event) {
    var people = this.get("people");
    for(var i = 0; i < people.length; i++) {
      var attendedObj = event.personAdded(people[i]),
          personEvt = Expense.PersonEvent.create({
            eventObj : event,
            attendedObj : attendedObj,
            personObj : people[i],
          });
      people[i].get("events").pushObject(personEvt);
    }
  },
});
var data = Expense.DataObject.create({people : [], events : []});

Expense.PersonEvent = Ember.Object.extend({
  init : function() {
    this._super();
    this.get("toPay");
    this.get("paid");
  },

  eventObj : null,
  attendedObj : null,
  personObj : null,
  toPay : Ember.computed.alias("attendedObj.toPay"),
  paid : Ember.computed.alias("attendedObj.paid"),
});

Expense.Person = Ember.Object.extend({
  name : "",
  id : 0,

  owes : 0,
  owed : 0,

  owesOwedHasToChange : function() {
    var events = this.get("events");
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
  }.observes('events.@each.toPay', 'events.@each.paid'),

  events : Utils.hasMany(Expense.PersonEvent),
});

Expense.PersonAttended = Ember.Object.extend({
  personObj : null,
  name : Ember.computed.alias('personObj.name'),
  toPay : 0,
  paid : 0,
  eventObj : null,
});

Expense.Event = Ember.Object.extend({
  init : function() {
    this._super();
    this.set("peopleAttended", this.get("peopleAttended") || []);
    this.set("peopleNotAttended", this.get("peopleNotAttended") || []);
  },

  id : 0,
  name : "",
  amt : 0,

  data : data,

  peopleAttended : Utils.hasMany(Expense.PersonAttended),
  peopleNotAttended : Utils.hasMany(Expense.PersonAttended),

  personRemoved : function(name) {
    var peopleAttended = this.get("peopleAttended"), peopleNotAttended = this.get("peopleNotAttended"),
        inAttended = peopleAttended.findBy("name", name), inNotAttended = peopleNotAttended.findBy("name", name);
    if(inAttended) {
      peopleAttended.removeObject(inAttended);
      return inAttended;
    }
    else if(inNotAttended) {
      peopleNotAttended.removeObject(inNotAttended)
      return inNotAttended;
    }
  },

  personAdded : function(personObj) {
    var peopleNotAttended = this.get("peopleNotAttended"),
        id = this.get("id"),
        attendedObj = Expense.PersonAttended.create({
          personObj : personObj,
          eventObj : this,
          toPay : 0,
          paid : 0,
        });
    peopleNotAttended.pushObject(attendedObj);
    return attendedObj;
  },

  amtPaid : function() {
    var peopleAttended = this.get("peopleAttended");
    return peopleAttended.reduce(function(s, e, i, a) {
      return s + Number(e.paid);
    }, 0);
  }.property('peopleAttended.@each.paid'),

  amtRemained : function() {
    return Number(this.get("amt")) - Number(this.get("amtPaid"));
  }.property('amtPaid'),

  updateShare : function() {
    var uninvolved = this.get("peopleNotAttended"),
        involved = this.get("peopleAttended"),
        amt = Number(this.get("amt"));
    uninvolved.forEach(function(e, i, a) {
      e.set("toPay", 0);
    });
    involved.forEach(function(e, i, a) {
      e.set("toPay", amt / involved.length);
    });
  }.observes('peopleAttended.@each', 'amt'),
});

Expense.PersonFinal = Utils.ObjectWithArray.extend({
  name : "",
  arrayProps : ['toPay', 'toRecieve'],
  toPay : null,
  toPayFilterAddedObjects : function(toPay, addedObjs) {
    var toRecieve = this.get("toRecieve");
    for(var i = 0; i < addedObjs.length;) {
      var addedObj = addedObjs[i],
          existingToPay = toPay.findBy("name", addedObj.get("name")),
          existingToRecieve = toRecieve.findBy("name", addedObj.get("name"));
      if(existingToPay) {
        existingToPay.set("amt", existingToPay.get("amt") + addedObj.get("amt"));
        addedObjs.removeObject(addedObj);
      }
      else if(existingToRecieve) {
        var diff = addedObj.get("amt") - existingToRecieve.get("amt");
        if(diff > 0) {
          addedObj.set("amt", diff);
          toRecieve.removeObject(existingToRecieve);
          i++;
        }
        else if(diff < 0) {
          existingToRecieve.set("amt", -diff);
          addedObjs.removeObject(addedObj);
        }
        else {
          toRecieve.removeObject(existingToRecieve);
          addedObjs.removeObject(addedObj);
        }
      }
      else {
        i++;
      }
    }
    return addedObjs;
  },
  toRecieve : null,
  toRecieveFilterAddedObjects : function(toRecieve, addedObjs) {
    var toPay = this.get("toPay");
    for(var i = 0; i < addedObjs.length;) {
      var addedObj = addedObjs[i],
          existingToPay = toPay.findBy("name", addedObj.get("name")),
          existingToRecieve = toRecieve.findBy("name", addedObj.get("name"));
      if(existingToRecieve) {
        existingToRecieve.set("amt", existingToRecieve.get("amt") + addedObj.get("amt"));
        addedObjs.removeObject(addedObj);
      }
      else if(existingToPay) {
        var diff = addedObj.get("amt") - existingToPay.get("amt");
        if(diff > 0) {
          addedObj.set("amt", diff);
          toPay.removeObject(existingToPay);
          i++;
        }
        else if(diff < 0) {
          existingToPay.set("amt", -diff);
          addedObjs.removeObject(addedObj);
        }
        else {
          toPay.removeObject(existingToPay);
          addedObjs.removeObject(addedObj);
        }
      }
      else {
        i++;
      }
    }
    return addedObjs;
  },
  owes : 0,
  owed : 0,
});

Expense.PersonBalanceFinal = Ember.Object.extend({
  name : "",
  amt : 0,
});

Expense.ReportObject = Ember.Object.extend({
  peopleObjs : null,

  name : "",
  owes : 0,
  owed : 0,
  people : function(key, value) {
    if(arguments.length > 1) {
      var retval = [];
      if(value && value.length) {
        for(var i = 0; i < value.length; i++) {
          retval.push(Expense.PersonFinal.create({
            name : value[i].get("name"),
            owes : value[i].get("owes"),
            owed : value[i].get("owed"),
          }));
        }
        this.updateShare(retval);
      }
      return retval;
    }
  }.property(),

  addPersonBalance : function(arrObj, name, amt) {
    arrObj.pushObject(Expense.PersonBalanceFinal.create({
      name : name,
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
            that.addPersonBalance(owedStack[0].get("toRecieve"), e.get("name"), e.get("owes"));
            that.addPersonBalance(e.get("toPay"), owedStack[0].get("name"), e.get("owes"));
            e.set("owes", 0);
          }
          else {
            that.addPersonBalance(owedStack[0].get("toRecieve"), e.get("name"), owedStack[0].get("owed"));
            that.addPersonBalance(e.get("toPay"), owedStack[0].get("name"), owedStack[0].get("owed"));
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
            that.addPersonBalance(owesStack[0].get("toPay"), e.get("name"), e.get("owes"));
            that.addPersonBalance(e.get("toRecieve"), owesStack[0].get("name"), e.get("owes"));
            e.set("owed", 0);
          }
          else {
            that.addPersonBalance(owesStack[0].get("toPay"), e.get("name"), owesStack[0].get("owes"));
            that.addPersonBalance(e.get("toRecieve"), owesStack[0].get("name"), owesStack[0].get("owes"));
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
