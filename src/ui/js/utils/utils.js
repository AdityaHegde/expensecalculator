Utils = Ember.Namespace.create();
Utils.deepSearchArray = function(d, e, k, ak) { //d - data, e - element, k - key, ak - array key
  if(e === undefined || e === null) return false;
  if(d[k] === e) return true;
  if(d[ak]) {
    for(var i = 0; i < d[ak].length; i++) {
      if(Utils.deepSearchArray(d[ak][i], e, k, ak)) return true;
    }
  }
  return false;
};

Utils.cmp = function(a, b) {
  return a - b;
};
Utils.binarySearch = function(a, e, l, h, c) {
  var i = Math.floor((h + l) / 2), o = a.objectAt(i);
  if(l > h) return l;
  if(c(e, o) >= 0) {
    return Utils.binarySearch(a, e, i + 1, h, c);
  }
  else {
    return Utils.binarySearch(a, e, l, i - 1, c);
  }
};
Utils.binaryInsert = function(a, e, c) {
  c = c || Utils.cmp;
  var len = a.get("length");
  if(len > 0) {
    var i = Utils.binarySearch(a, e, 0, a.get("length") - 1, c);
    a.insertAt(i, e);
  }
  else {
    a.pushObject(e);
  }
};

Utils.hasMany = function(modelClass, modelClassMap, modelClassKey) {
  modelClass = modelClass || Ember.Object;
  var hasInheritance = modelClassMap && modelClassKey;
  var ret = function(key, newval) {
    if(Ember.typeOf(modelClass) == 'string') {
      modelClass = Ember.get(modelClass);
    }
    modeC
    if(arguments.length > 1) {
      var _newval = [];
      if(newval.length) {
        for(var i = 0; i < newval.length; i++) {
          if(hasInheritance) modelClass = modelClassMap[newval[i][modelClassKey]];
          if(!(newval[i] instanceof modelClass)) {
            var obj = modelClass.create(newval[i]);
            obj.set("parentObj", this);
            _newval.push(obj);
          }
        }
      }
      return _newval;
    }
  }.property();
  return ret;
};

Utils.belongsTo = function(modelClass) {
  modelClass = modelClass || Ember.Object;
  var ret = function(key, newval) {
    if(Ember.typeOf(modelClass) == 'string') {
      modelClass = Ember.get(modelClass);
    }
    if(arguments.length > 1) {
      if(newval && !(newval instanceof modelClass)) {
        newval = modelClass.create(newval);
      }
      return newval;
    }
  }.property();
  return ret;
};

Utils.HashMapArrayComputed = function(elementClass, keyForKey, keyForVal, dontBind) {
  return function(key, newval) {
    if(arguments.length > 1) {
      return Utils.HashMapArray.create({
        elementClass : elementClass,
        keyForKey : keyForKey,
        keyForVal : keyForVal,
        hashMap : newval,
        content : [],
        parentObj : this,
      });
    }
  }.property();
};
Utils.HashMapArrayInnerComputed = function(hashMapArrayActual) {
  return function(key, newval) {
    if(arguments.length > 1) {
      this.set(hashMapArrayActual, newval);
      return newval;
    }
  }.property();
};
Utils.HashMapArray = Ember.ArrayProxy.extend({
  elementClass : null,
  keyForKey : null,
  keyForVal : null,

  parentObj : null,

  hashMap : null,
  hashMapDidChange : function() {
    var elementClass = this.get("elementClass"), hashMap = this.get("hashMap"),
        keyForKey = this.get("keyForKey"), keyForVal = this.get("keyForVal");
    for(var k in hashMap) {
      var val = elementClass.create({parentObj : this.get("parentObj")});
      val.set(keyForVal, hashMap[k]);
      val.set(keyForKey, k);
      this.pushObject(val);
    }
  }.observes('hashMap').on('init'),

  arrayElementValueDidChange : function(obj, key) {
    var hashMap = this.get("hashMap"),
        keyForKey = this.get("keyForKey"), keyForVal = this.get("keyForVal");
    hashMap[obj.get(keyForKey)] = obj.get(keyForVal);
  },

  arrayElementKeyWillChange : function(obj, key) {
    var hashMap = this.get("hashMap"),
        keyForKey = this.get("keyForKey"), keyForVal = this.get("keyForVal");
    delete hashMap[obj.get(keyForKey)];
  },

  arrayElementKeyDidChange : function(obj, key) {
    this.arrayElementValueDidChange(obj, key);
  },

  lockArray : false,

  contentArrayWillChange : function(array, idx, removedCount, addedCount) {
    if(!this.get("lockArray")) {
      var removedObjects = array.slice(idx, idx+removedCount), hashMap = this.get("hashMap"),
          keyForKey = this.get("keyForKey"), keyForVal = this.get("keyForVal");
      for(var i = 0; i < removedObjects.length; i++) {
        delete hashMap[removedObjects[i].get(keyForKey)];
        Ember.removeObserver(removedObjects[i], keyForVal, this, this.arrayElementValueDidChange);
        Ember.removeBeforeObserver(removedObjects[i], keyForKey, this, this.arrayElementKeyWillChange);
        Ember.removeObserver(removedObjects[i], keyForKey, this, this.arrayElementKeyDidChange);
      }
    }
  },

  contentArrayDidChange : function(array, idx, removedCount, addedCount) {
    if(!this.get("lockArray")) {
      var addedObjects = array.slice(idx, idx+addedCount), hashMap = this.get("hashMap"), elementClass = this.get("elementClass"),
          keyForKey = this.get("keyForKey"), keyForVal = this.get("keyForVal");
      for(var i = 0; i < addedObjects.length; i++) {
        var existing = array.findBy(keyForKey, (addedObjects[i].get && addedObjects[i].get(keyForKey)) || addedObjects[i][keyForKey]), index = array.indexOf(existing);
        if(index < idx || index > idx+addedCount) {
          array.removeObject(existing);
          if(index < idx) idx--;
          if(addedObjects[i].set) {
            addedObjects[i].set(keyForVal, existing.get(keyForVal));
          }
          else {
            addedObjects[i][keyForVal] = existing.get(keyForVal);
          }
        }
        if(!(addedObjects[i] instanceof elementClass)) {
          addedObjects[i] = elementClass.create(addedObjects[i]);
          this.set("lockArray", true);
          array.removeAt(idx + i);
          array.insertAt(idx + i, addedObjects[i]);
          this.set("lockArray", false);
        }
        addedObjects[i].set("parentObj", this.get("parentObj"));
        hashMap[addedObjects[i].get(keyForKey)] = addedObjects[i].get(keyForVal);
        Ember.addObserver(addedObjects[i], keyForVal, this, this.arrayElementValueDidChange);
        Ember.addBeforeObserver(addedObjects[i], keyForKey, this, this.arrayElementKeyWillChange);
        Ember.addObserver(addedObjects[i], keyForKey, this, this.arrayElementKeyDidChange);
      }
    }
  },
});

Utils.ObjectWithArrayMixin = Ember.Mixin.create({
  init : function() {
    this._super();
    this.set("arrayProps", this.get("arrayProps") || []);
    this.addArrayObserverToProp("arrayProps");
    var arrayProps = this.get("arrayProps");
    for(var i = 0; i < arrayProps.length; i++) {
      this.arrayPropWasAdded(arrayProps[i]);
    }
  },

  addBeforeObserverToProp : function(propKey) {
    Ember.addBeforeObserver(this, propKey, this, "propWillChange");
  },

  removeBeforeObserverFromProp : function(propKey) {
    Ember.removeBeforeObserver(this, propKey, this, "propWillChange");
  },

  addObserverToProp : function(propKey) {
    Ember.addObserver(this, propKey, this, "propDidChange");
  },

  removeObserverFromProp : function(propKey) {
    Ember.removeObserver(this, propKey, this, "propDidChange");
  },

  propWillChange : function(obj, key) {
    this.removeArrayObserverFromProp(key);
  },

  propDidChange : function(obj, key) {
    this.addArrayObserverToProp(key);
  },

  addArrayObserverToProp : function(propKey) {
    var prop = this.get(propKey);
    if(prop) {
      prop.set("propKey", propKey);
      prop.addArrayObserver(this, {
        willChange : this.propArrayWillChange,
        didChange : this.propArrayDidChange,
      });
    }
  },

  removeArrayObserverFromProp : function(propKey) {
    var prop = this.get(propKey);
    if(prop) {
      prop.removeArrayObserver(this);
    }
  },

  propArrayWillChange : function(array, idx, removedCount, addedCount) {
    if((array.content || array.length) && array.get("length") > 0) {
      var propKey = array.get("propKey");
      for(var i = idx; i <= idx + removedCount; i++) {
        this[propKey+"WillBeDeleted"](array.objectAt(i));
      }
    }
  },
  propArrayDidChange : function(array, idx, removedCount, addedCount) {
    if((array.content || array.length) && array.get("length") > 0) {
      var propKey = array.get("propKey"), removed = 0;
      for(var i = idx; i < idx + addedCount - removed;) {
        var obj = array.objectAt(i);
        if(!this[propKey+"CanAdd"](obj)) {
          array.removeObject(obj);
          removed++;
        }
        else {
          this[propKey+"WasAdded"](obj);
          i++;
        }
      }
    }
  },

  propWillBeDeleted : function(prop) {
  },
  propCanAdd : function(prop) {
    return true;
  },
  propWasAdded : function(prop) {
  },

  arrayProps : null,
  arrayPropsWillBeDeleted : function(arrayProp) {
    this.removeArrayObserverFromProp(arrayProp);
    this.removeBeforeObserverFromProp(arrayProp);
    this.removeObserverFromProp(arrayProp);
  },
  arrayPropWasAdded : function(arrayProp) {
    var prop = this.get(arrayProp);
    if(!prop) this.set(arrayProp, []);
    if(!this[arrayProp+"WillBeDeleted"]) this[arrayProp+"WillBeDeleted"] = this.propWillBeDeleted;
    if(!this[arrayProp+"CanAdd"]) this[arrayProp+"CanAdd"] = this.propCanAdd;
    if(!this[arrayProp+"WasAdded"]) this[arrayProp+"WasAdded"] = this.propWasAdded;
    this.addArrayObserverToProp(arrayProp);
    this.addBeforeObserverToProp(arrayProp);
    this.addObserverToProp(arrayProp);
  },

});

Utils.DelayedAddToHasMany = Ember.Mixin.create(Utils.ObjectWithArrayMixin, {
  init : function() {
    this._super();
    this.set("arrayPropDelayedObjs", {});
  },

  arrayPropDelayedObjs : null,

  addObserverToProp : function(propKey, method) {
    method = method || "propWasUpdated";
    Ember.addObserver(this, propKey, this, method);
  },

  removeObserverFromProp : function(propKey) {
    method = method || "propWasUpdated";
    Ember.removeObserver(this, propKey, this, method);
  },

  addToProp : function(prop, propObj) {
    var arrayPropDelayedObjs = this.get("arrayPropDelayedObjs"), propArray = this.get(prop);
    if(propArray.isFulfilled) {
      if(!propArray.contains(propObj)) {
        propArray.pushObject(propObj);
      }
    }
    else {
      arrayPropDelayedObjs[prop] = arrayPropDelayedObjs[prop] || [];
      if(!arrayPropDelayedObjs[prop].contains(propObj)) {
        arrayPropDelayedObjs[prop].push(propObj);
      }
    }
  },

  hasArrayProp : function(prop, findKey, findVal) {
    var arrayPropDelayedObjs = this.get("arrayPropDelayedObjs"), propArray = this.get(prop);
    if(propArray.isFulfilled) {
      return !!propArray.findBy(findKey, findVal);
    }
    else if(arrayPropDelayedObjs && arrayPropDelayedObjs[prop]) {
      return !!arrayPropDelayedObjs[prop].findBy(findKey, findVal);
    }
    return false;
  },

  addToContent : function(prop) {
    var arrayPropDelayedObjs = this.get("arrayPropDelayedObjs"), propArray = this.get(prop);
    if(propArray.isFulfilled && propArray.content && arrayPropDelayedObjs[prop]) {
      propArray.pushObjects(arrayPropDelayedObjs[prop]);
      delete arrayPropDelayedObjs[prop];
    }
  },

  arrayProps : null,
  arrayPropsWillBeDeleted : function(arrayProp) {
    this.removeObserverFromProp(arrayProp+".isFulfilled");
    //this.removeObserverFromProp(arrayProp+".isRejected");
  },
  arrayPropWasAdded : function(arrayProp) {
    var prop = this.get(arrayProp), that = this;
    if(!this["addTo_"+arrayProp]) this["addTo_"+arrayProp] = function(propObj) {
      that.addToProp(arrayProp, propObj);
    };
    this.addObserverToProp(arrayProp+".content", function(obj, key) {
      that.addToContent(arrayProp);
    });
    //this.addObserverToProp(arrayProp+".isRejected");
  },

});
