Expense.DataObject = Ember.Object.extend({
  people : [],
  bills : [],
});
var data = Expense.DataObject.create({});

Expense.Person = Ember.Object.extend({
  name : "",
  id : 0,

  owes : function() {
    return this.get("bills").reduce(function(s, e, i, a) {
      return s + Number(e.owes);
    }, 0);
  }.property('bills.@each.owes'),

  owed : function() {
    return this.get("bills").reduce(function(s, e, i, a) {
      return s + Number(e.owed);
    }, 0);
  }.property('bills.@each.owed'),

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
        peopleUninvolved.addObject(Expense.PersonInvolved.create({
          personObj : e,
          name : e.name,
          billId : id,
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

  peopleInvolvedChanged : function() {
    var uninvolved = this.get("peopleUninvolved"),
        involved = this.get("peopleInvolved"),
        amt = Number(this.get("amt"));
    uninvolved.forEach(function(e, i, a) {
      e.set("toPay", 0);
    });
    involved.forEach(function(e, i, a) {
      e.set("toPay", amt / involved.length);
    });
  }.observes('peopleInvolved.@each'),
});

Expense.PersonInvolved = Ember.Object.extend({
  personObj : null,
  name : "",
  toPay : 0,
  paid : 0,
  billId : 0,

  /*owes : function() {
    var owes = this.get("toPay") - this.get("paid"),
        personBills = this.get("personObj").get("bills");
    owes = owes < 0 ? 0 : owes;
    personBills[this.get("billId")].set("owes", owes);
    return owes;
  }.property('toPay', 'paid'),

  owed : function() {
    var owed = this.get("paid") - this.get("toPay"),
        personBills = this.get("personObj").get("bills");
    owed = owed < 0 ? 0 : owed;
    personBills[this.get("billId")].set("owed", owed);
    return owed;
  }.property('toPay', 'paid'),*/

  observerTest : function() {
    var toPay = this.get("toPay"), paid = this.get("paid") || 0,
        owed = paid - toPay, owes = toPay - paid,
        personBills = this.get("personObj").get("bills"), billId = this.get("billId");
    owed = owed < 0 ? 0 : owed;
    owes = owes < 0 ? 0 : owes;
    personBills[billId].set("owes", owes);
    personBills[billId].set("owed", owed);
    //console.log(this.get("name") + "::" + owed + "::" + owes);
  }.observes('toPay', 'paid'),
});
