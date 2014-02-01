Expense.DataObject = Ember.Object.extend({
  outing_name : "new",
  people : Utils.hasMany('Expense.Person'),
  events : Utils.hasMany('Expense.Event'),
});
var data = Expense.DataObject.create({people : [], events : []});

Expense.PersonEvent = Ember.Object.extend({
  owes : 0,
  owed : 0,
  eventId : 0,
});

Expense.Person = Ember.Object.extend({
  name : "",
  id : 0,

  owes : 0,
  owed : 0,

  owedOrOwesChanges : function() {
    var events = this.get("events");
        owed = events.reduce(function(s, e, i, a) {
          return s + Number(e.owes);
        }, 0),
        owes = events.reduce(function(s, e, i, a) {
          return s + Number(e.owed);
        }, 0),
        diff = owed - owes;
    this.set("owes", (diff > 0 ? diff : 0));
    this.set("owed", (diff < 0 ? -diff : 0));
  }.observes('events.@each.owes', 'events.@each.owed'),

  events : Utils.hasMany(Expense.PersonEvent),
});

Expense.PersonAttended = Ember.Object.extend({
  personObj : null,
  name : function(key, newval) {
    var personObj = this.get("personObj");
    if(arguments.length == 1) {
      if(personObj) return personObj.name;
      return "";
    }
    else {
      if(!personObj) {
        personObj = data.get("people").findBy('name', newval);
        this.set("personObj", personObj);
      }
      return newval;
    }
  }.property('personObj.name'),
  toPay : 0,
  paid : 0,
  eventId : 0,

  updateOwesOwed : function() {
    var toPay = this.get("toPay"), paid = this.get("paid") || 0,
        owed = paid - toPay, owes = toPay - paid,
        personEvents = this.get("personObj").get("events"), eventId = this.get("eventId");
    owed = owed < 0 ? 0 : owed;
    owes = owes < 0 ? 0 : owes;
    personEvents[eventId].set("owes", owes);
    personEvents[eventId].set("owed", owed);
  }.observes('toPay', 'paid'),

  setPersonObj : function() {
    var personObj = this.get("personObj");
    if(!personObj) {
      personObj = data.get("people").findBy('name', this.get("name"));
      this.set("personObj", personObj);
    }
  }.observes('name'),

  nameChanged : function() {
    this.set("name", this.get("personObj").name);
  }.observes('personObj.name'),
});

Expense.Event = Ember.Object.extend({
  id : 0,
  name : "",
  amt : 0,

  data : data,

  peopleAttended : Utils.hasMany(Expense.PersonAttended),

  peopleNotAttended : function() {
    var peopleAttended = this.get("peopleAttended"),
        peopleNotAttended = [],
        people = this.get("data").get("people"),
        id = this.get("id");
    people.forEach(function(e) {
      if(!peopleAttended.findBy('name', e.name)) {
        peopleNotAttended.push(Expense.PersonAttended.create({
          personObj : e,
          name : e.name,
          eventId : id,
          toPay : 0,
          paid : 0,
        }));
      }
    });
    return peopleNotAttended;
  }.property('data.people.@each', 'peopleAttended.@each'),

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

Expense.PersonFinal = Ember.Object.extend({
  name : "",
  personObj : null,
  toPay : [],
  toRecieve : [],
  owes : 0,
  owed : 0,

  owesOwedChanged : function() {
    var personObj = this.get("personObj");
    this.set("toPay", []);
    this.set("owes", personObj.owes);
    this.set("toRecieve", []);
    this.set("owed", personObj.owed);
  }.observes('personObj.owes', 'personObj.owed'),

  nameChanged : function() {
    this.set("name", this.get("personObj").name);
  }.observes('personObj.name'),

  removeDuplicates : function() {
    var toPay = this.get("toPay"),
        toRecieve = this.get("toRecieve");
    toPay.forEach(function(e, i, a) {
      var d = toRecieve.findBy("name", e.name);
      if(d) {
        var diff = e.amt - d.amt;
        if(diff > 0) {
          e.amt -= d.amt;
          a.removeObject(e);
        }
        else if(diff < 0) {
          d.amt -= e.amt;
          toRecieve.removeObject(d);
        }
        else {
          a.removeObject(e);
          toRecieve.removeObject(d);
        }
      }
    });
  }.observes('toPay.@each.amt', 'toRecieve.@each.amt'),
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
  people : function() {
    var peopleObjs = this.get("peopleObjs"),
        people = [];
    peopleObjs.forEach(function(e, i, a) {
      people.push(Expense.PersonFinal.create({name : e.name, toPay : [], toRecieve : [], owes : e.owes, owed : e.owed, personObj : e}));
    });
    this.updateShare(people);
    return people;
  }.property('peopleObjs.@each'),

  addPersonBalance : function(arrObj, name, amt) {
    var e = arrObj.findBy('name', name);
    if(e) {
      e.set("amt", e.amt + amt);
    }
    else {
      arrObj.addObject(Expense.PersonBalanceFinal.create({
        name : name,
        amt : amt,
      }));
    }
  },

  updateShare : function(people) {
    var owedStack = [],
        owesStack = [],
        that = this;
    people.forEach(function(e, i, a) {
      if(e.owes > 0) {
        while(owedStack.length > 0 && e.owes > 0) {
          var remains = owedStack[0].owed - e.owes;
          if(remains > 0) {
            that.addPersonBalance(owedStack[0].toRecieve, e.name, e.owes);
            that.addPersonBalance(e.toPay, owedStack[0].name, e.owes);
            e.set("owes", 0);
          }
          else {
            that.addPersonBalance(owedStack[0].toRecieve, e.name, owedStack[0].owed);
            that.addPersonBalance(e.toPay, owedStack[0].name, owedStack[0].owed);
            e.set("owes", e.owes - owedStack[0].owed);
            owedStack[0].set("owed", 0);
            owedStack.shift();
          }
        }
        if(e.owes > 0) owesStack.push(e);
      }
      else if(e.owed > 0) {
        while(owesStack.length > 0 && e.owed > 0) {
          var remains = owesStack[0].owes - e.owed;
          if(remains > 0) {
            that.addPersonBalance(owesStack[0].toPay, e.name, e.owes);
            that.addPersonBalance(e.toRecieve, owesStack[0].name, e.owes);
            e.set("owed", 0);
          }
          else {
            that.addPersonBalance(owesStack[0].toPay, e.name, owesStack[0].owes);
            that.addPersonBalance(e.toRecieve, owesStack[0].name, owesStack[0].owes);
            e.set("owed", e.owed - owesStack[0].owes);
            owesStack[0].set("owes", 0);
            owesStack.shift();
          }
        }
        if(e.owed > 0) owedStack.push(e);
      }
    });
  },
});
