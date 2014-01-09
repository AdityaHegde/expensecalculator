Expense.DataObject = Ember.Object.extend({
  people : [],
  bills : [],
});
var data = Expense.DataObject.create({});

Expense.Person = Ember.Object.extend({
  name : "",
  id : 0,

  owes : 0,
  owed : 0,

  owedOrOwesChanges : function() {
    var bills = this.get("bills");
        owed = bills.reduce(function(s, e, i, a) {
          return s + Number(e.owes);
        }, 0),
        owes = bills.reduce(function(s, e, i, a) {
          return s + Number(e.owed);
        }, 0),
        diff = owed - owes;
    this.set("owes", (diff > 0 ? diff : 0));
    this.set("owed", (diff < 0 ? -diff : 0));
  }.observes('bills.@each.owes', 'bills.@each.owed'),

  bills : [],
});

Expense.PersonBill = Ember.Object.extend({
  owes : 0,
  owed : 0,
  billId : 0,
});

Expense.Bill = Ember.Object.extend({
  id : 0,
  name : "",
  amt : 0,

  people : data.people,

  peopleUninvolved : [],

  peopleInvolved : [],

  updatePeople : function() {
    var peopleInvolved = this.get("peopleInvolved"),
        peopleUninvolved = this.get("peopleUninvolved"),
        people = this.get("people"),
        id = this.get("id");
    people.forEach(function(e) {
      if(!peopleInvolved.findBy('name', e.name) && !peopleUninvolved.findBy('name', e.name)) {
        peopleInvolved.addObject(Expense.PersonInvolved.create({
          personObj : e,
          name : e.name,
          billId : id,
          toPay : 0,
          paid : 0,
        }));
        e.get("bills").addObject(Expense.PersonBill.create({
          billId : id,
          owes : 0,
          owed : 0,
        }));
      }
    });
  }.observes('people.@each'),

  amtPaid : function() {
    var peopleInvolved = this.get("peopleInvolved");
    return peopleInvolved.reduce(function(s, e, i, a) {
      return s + Number(e.paid);
    }, 0);
  }.property('peopleInvolved.@each.paid'),

  amtRemained : function() {
    return Number(this.get("amt")) - Number(this.get("amtPaid"));
  }.property('amtPaid'),

  updateShare : function() {
    var uninvolved = this.get("peopleUninvolved"),
        involved = this.get("peopleInvolved"),
        amt = Number(this.get("amt"));
    uninvolved.forEach(function(e, i, a) {
      e.set("toPay", 0);
    });
    involved.forEach(function(e, i, a) {
      e.set("toPay", amt / involved.length);
    });
  }.observes('peopleInvolved.@each', 'amt'),
});

Expense.PersonInvolved = Ember.Object.extend({
  personObj : null,
  name : "",
  toPay : 0,
  paid : 0,
  billId : 0,

  observerTest : function() {
    var toPay = this.get("toPay"), paid = this.get("paid") || 0,
        owed = paid - toPay, owes = toPay - paid,
        personBills = this.get("personObj").get("bills"), billId = this.get("billId");
    owed = owed < 0 ? 0 : owed;
    owes = owes < 0 ? 0 : owes;
    personBills[billId].set("owes", owes);
    personBills[billId].set("owed", owed);
  }.observes('toPay', 'paid'),

  nameChanged : function() {
    this.set("name", this.get("personObj").name);
  }.observes('personObj.name'),
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
  data : null,

  name : "",
  owes : 0,
  owed : 0,
  people : [],

  stopCalcFlag : false,

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

  updateShare : function(data) {
    var people = this.get("people"),
        owedStack = [],
        owesStack = [],
        that = this;
    if(this.get("stopCalcFlag")) return;
    this.set("stopCalcFlag", true);
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
    this.set("stopCalcFlag", false);
  }.observes('people.@each.owes', 'people.@each.owed'),

  updatePeople : function() {
    var data = this.get("data"),
        people = this.get("people"),
        owedStack = [],
        owesStack = [];
    data.people.forEach(function(e, i, a) {
      var person = people.findBy('name', e.name);
      if(!person) {
        person = Expense.PersonFinal.create({name : e.name, toPay : [], toRecieve : [], owes : e.owes, owed : e.owed, personObj : e});
        people.addObject(person);
      }
    });
  }.observes('data.people.@each'),
});

var report = Expense.ReportObject.create({data : [], people : [], name : ""});
