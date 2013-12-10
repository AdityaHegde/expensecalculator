Expense.CalcController = Ember.Controller.extend({
  addingPerson : false,
  newPerson : null,
  addingBill : false,
  newBill : null,

  totalAmt : function() {
    var bills = this.get("model").get("bills");
    return bills.reduce(function(s, e, i, a) {
      return s + Number(e.amt);
    }, 0);
  }.property('model.bills.@each.amt'),

  amtPaid : function() {
    var bills = this.get("model").get("bills");
    return bills.reduce(function(s, e, i, a) {
      return s + Number(e.amtPaid || 0);
    }, 0);
  }.property('model.bills.@each.amtPaid'),

  amtRemained : function() {
    return Number(this.get("totalAmt")) - Number(this.get("amtPaid"));
  }.property('amtPaid'),

  adding : function() {
    return this.get("addingPerson") || this.get("addingBill");
  }.property('addingPerson', 'addingBill'),

  actions : {
    addPerson : function() {
      var newPerson = Expense.Person.create({id : data.people.length, bills : []});
      this.set("newPerson", newPerson);
      this.set("addingPerson", true);
      this.get("model").people.pushObject(newPerson);
    },

    savePerson : function() {
      this.set("addingPerson", false);
    },

    cancelEditPerson : function() {
      this.get("model").people.removeAt(data.people.length - 1);
      this.set("addingPerson", false);
    },

    addBill : function() {
      var newBill = Expense.Bill.create({id : data.bills.length, peopleInvolved : [], peopleUninvolved : [], amt : 0});
      this.set("newBill", newBill);
      this.set("addingBill", true);
      this.get("model").bills.addObject(newBill);
      newBill.updatePeople();
    },

    saveBill : function() {
      this.set("addingBill", false);
    },

    cancelEditBill : function() {
      this.get("model").bills.removeAt(data.bills.length - 1);
      this.set("addingBill", false);
    },
  },
});

Expense.PersonController = Ember.Controller.extend({
});

Expense.BillController = Ember.Controller.extend({
  people : data.people,
  isEditingAmt : false,

  actions : {
    editAmt : function() {
      this.set("isEditingAmt", true);
    },

    doneEditingAmt : function() {
      this.set("isEditingAmt", false);
    },

    removePerson : function(person) {
      var uninvolved = this.get("model").peopleUninvolved,
          involved = this.get("model").peopleInvolved;
      uninvolved.addObject(person);
      involved.removeObject(person);
    },

    addPerson : function(person) {
      var uninvolved = this.get("model").peopleUninvolved,
          involved = this.get("model").peopleInvolved;
      uninvolved.removeObject(person);
      involved.addObject(person);
    },
  },
});

Expense.ReportController = Ember.Controller.extend({
  reportLink : "",

  actions : {
    saveEvent : function() {
      var postData = {people : data.people.copy(), bills : data.bills.copy()};
      /*postData.bills.forEach(function(e, i, a) {
        for(var j = 0; j < e.peopleUninvolved.length; j++) {
          delete e.peopleUninvolved[j].personObj;
        }
        for(var j = 0; j < e.peopleInvolved.length; j++) {
          delete e.peopleInvolved[j].personObj;
        }
      });*/
      console.log(JSON.stringify(postData));
      new XHR({
        url : "http://localhost:8080/data",
        params : "calcData="+JSON.stringify(postData),
      }).send();
      this.set("reportLink", window.location.origin+"/#/calc"+this.get("model").name);
    },
  },
});
