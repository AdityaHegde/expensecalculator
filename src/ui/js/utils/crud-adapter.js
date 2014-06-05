CrudAdapter = Ember.Namespace.create()
CrudAdapter.GlobalData = Ember.Object.create();
CrudAdapter.endPoint = {
  find : "get",
};
CrudAdapter.ApplicationAdapter = DS.RESTAdapter.extend({
  getQueryParams : function(type, query, record, inBody) {
    var extraParams = {};
    for(var i = 0; i < type.queryParams.length; i++) {
      extraParams[type.queryParams[i]] = record.get(type.queryParams[i]) || CrudAdapter.GlobalData.get(type.queryParams[i]);
      //find a better way to handle this (primary key shudnt be sent during create request)
      if(query[type.queryParams[i]] == 'all') delete query[type.queryParams[i]];
    }
    //delete generated field
    if(!type.retainId) delete query.id;
    if(inBody) {
      //only sent for create / update
      if(type.ignoreFieldsOnCreateUpdate) {
        for(var i = 0; i < type.ignoreFieldsOnCreateUpdate.length; i++) {
          delete query[type.ignoreFieldsOnCreateUpdate[i]];
        }
      }
      var bodyParams = {data : query};
      Ember.merge(bodyParams, extraParams);
      return bodyParams;
    }
    else {
      Ember.merge(query, extraParams);
    }
    return query;
  },

  buildFindQuery : function(type, id, query) {
    var keys = type.keys || [], ids = id.split("__");
    for(var i = 0; i < keys.length; i++) {
      query[keys[i]] = (ids.length > i ? ids[i] : "");
    }
    if(type.findParams) {
      for(var i = 0; i < type.findParams.length; i++) {
        query[type.findParams[i]] = CrudAdapter.GlobalData.get(type.findParams[i]);
      }
    }
    return query;
  },

  buildURL : function(type, id) {
    var ty = (Ember.typeOf(type) == 'string' ? type : type.apiName || type.typeKey), url = '/' + ty;
    return url;
  },

  createRecord : function(store, type, record) {
    var data = this.serialize(record, { includeId: true });
    CrudAdapter.backupData(record, type, true);
    return this.ajax(this.buildURL(type)+"/create", 'POST', { data : this.getQueryParams(type, data, record, true) });
  },

  find : function(store, type, id) {
    return this.ajax(this.buildURL(type, id)+"/"+CrudAdapter.endPoint.find, 'GET', { data : this.buildFindQuery(type, id, {}) });
  },

  findAll : function(store, type) {
    return this.ajax(this.buildURL(type)+"/getAll", 'GET');
  },

  findQuery : function(store, type, query) {
    return this.ajax(this.buildURL(type)+"/getAll", 'GET', { data : query });
  },

  _findNext : function(store, type, query, id, queryType) {
    var adapter = store.adapterFor(type),
        serializer = store.serializerFor(type),
        label = "DS: Handle Adapter#find of " + type.typeKey;

    return $.ajax({
      url : adapter.buildURL(type)+"/"+queryType,
      method : 'GET', 
      data : { id : id, cur : Ember.get("CrudAdapter.GlobalData.cursor."+id) },
      dataType : "json",
    }).then(function(adapterPayload) {
      Ember.assert("You made a request for a " + type.typeKey + " with id " + id + ", but the adapter's response did not have any data", adapterPayload);
      var payload = serializer.extract(store, type, adapterPayload, id, "findNext");

      return store.push(type, payload);
    }, function(error) {
      var record = store.getById(type, id);
      record.notFound();
      throw error;
    }, "DS: Extract payload of '" + type + "'");
  },

  findNextFull : function(record, type, query) {
    type = (Ember.typeOf(type) === "string" ? record.store.modelFor(type) : type);
    CrudAdapter.backupData(record, type);
    return this._findNext(record.store, type, query, CrudAdapter.getId(record, type), "getFullNext");
  },

  findNext : function(record, type, query) {
    type = (Ember.typeOf(type) === "string" ? record.store.modelFor(type) : type);
    CrudAdapter.backupData(record, type);
    return this._findNext(record.store, type, query, CrudAdapter.getId(record, type), "getNext");
  },

  updateRecord : function(store, type, record) {
    var data = this.serialize(record, { includeId: true });
    CrudAdapter.backupData(record, type);
    return this.ajax(this.buildURL(type)+"/update", 'POST', { data : this.getQueryParams(type, data, record, true) });
  },

  deleteRecord : function(store, type, record) {
    var data = this.serialize(record, { includeId: true });
    return this.ajax(this.buildURL(type)+"/delete", 'GET', { data : this.getQueryParams(type, {}, record) });
  },
});

CrudAdapter.ApplicationSerializer = DS.RESTSerializer.extend({
  /*keyForRelationship : function(key, relationship) {
    this._super(key, relationship);
  },*/

  serializeRelations : function(type, payload, data, parent) {
    type.eachRelationship(function(name, relationship) {
      var plural = Ember.String.pluralize(relationship.type.typeKey);
      this.payload[plural] = this.payload[plural] || [];
      if(this.data[relationship.key]) {
        if(relationship.kind === "hasMany") {
          for(var i = 0; i < this.data[relationship.key].length; i++) {
            var childData = this.data[relationship.key][i], childModel, childType;
            if(relationship.options.polymorphic) {
              //TODO : make the type customizable
              childType = CrudAdapter.ModelMap[relationship.type.typeKey][this.data[relationship.key][i].type];
            }
            else {
              childType = (CrudAdapter.ModelMap[relationship.type.typeKey] && CrudAdapter.ModelMap[relationship.type.typeKey][data.type]) || relationship.type.typeKey;
            }
            childModel = this.serializer.store.modelFor(childType);
            this.serializer.serializeRelations(childModel, payload, childData, this.data);
            childData = this.serializer.normalize(childModel, childData, childType);
            this.payload[plural].push(childData);
            if(relationship.options.polymorphic) {
              //TODO : make the type customizable
              this.serializer.store.push(childType, childData);
              this.data[relationship.key][i] = {
                id : childData.id,
                type : childType,
              };
            }
            else {
              this.serializer.store.push(childType, childData);
              this.data[relationship.key][i] = childData.id;
            }
          }
        }
      }
      else if(relationship.kind === "belongsTo" && parent) {
        if(relationship.options.polymorphic) {
        }
        else {
          this.data[relationship.key] = CrudAdapter.getId(parent, relationship.type);
        }
      }
    }, {payload : payload, data : data, serializer : this});
  },

  extractSingle : function(store, type, payload, id, requestType) {
    if(payload.result.status == 1) throw new Ember.Error(payload.result.message);
    if(!payload || !payload.result) throw new Ember.Error("No data returned");
    if(Ember.typeOf(payload.result.data) == 'array') payload.result.data = payload.result.data[0];

    var metadata = Ember.copy(payload.result);
    delete metadata.data;
    store.metaForType(type, metadata);

    payload[type.typeKey] = payload.result.data || {};
    CrudAdapter.retrieveBackup(payload[type.typeKey], type, requestType !== 'createRecord');
    this.serializeRelations(type, payload, payload[type.typeKey]);
    delete payload.result;

    return this._super(store, type, payload, id, requestType);
  },

  extractArray : function(store, type, payload, id, requestType) {
    var plural = Ember.String.pluralize(type.typeKey);
    if(payload.result.status == 1) throw new Ember.Error(payload.result.message);
    if(!payload || !payload.result) throw new Ember.Error("No data returned");

    var metadata = Ember.copy(payload.result);
    delete metadata.data;
    store.metaForType(type, metadata);

    payload[plural] = payload.result.data || [];
    for(var i = 0; i < payload[plural].length; i++) {
      CrudAdapter.retrieveBackup(payload[plural][i], type, requestType !== 'createRecord');
      this.serializeRelations(type, payload, payload[plural][i]);
    }
    delete payload.result;

    return this._super(store, type, payload, id, requestType);
  },

  extractFindNext : function(store, type, payload) {
    var id = CrudAdapter.getId(payload.result.data, type);
    payload.result.data[type.paginatedAttribute].replace(0, 0, CrudAdapter.backupDataMap[type.typeKey][id][type.paginatedAttribute]);
    delete CrudAdapter.backupDataMap[type.typeKey][id];
    return this.extractSingle(store, type, payload);
  },

  extractDeleteRecord : function(store, type, payload) {
    if(payload.result.status == 1) throw new Ember.Error(payload.result.message);
    return null;
  },

  extractCreateRecord : function(store, type, payload) {
    return this.extractSingle(store, type, payload, null, "createRecord");
  },

  extractFindHasMany : function(store, type, payload) {
    return this._super(store, type, payload);
  },

  extract : function(store, type, payload, id, requestType) {
    return this._super(store, type, payload, id, requestType);
  },

  normalize : function(type, hash, prop) {
    //generate id property for ember data
    hash.id = CrudAdapter.getId(hash, type);
    this.normalizeAttributes(type, hash);
    this.normalizeRelationships(type, hash);

    this.normalizeUsingDeclaredMapping(type, hash);

    if (this.normalizeHash && this.normalizeHash[prop]) {
      hash = this.normalizeHash[prop](hash);
    }

    return hash;
  },

  normalizeHash : {
    outing : function(json) {
      return json;
    },

    "person-event" : function(json) {
      return json;
    },

    person : function(json) {
      return json;
    },

    "event-person" : function(json) {
      return json;
    },

    event : function(json) {
      return json;
    },
  },

  serialize : function(record, options) {
    var json = this._super(record, options);

    if (this.serializeHash && this.serializeHash[record.__proto__.constructor.typeKey]) {
      this.serializeHash[record.__proto__.constructor.typeKey](record, json);
    }

    return json;
  },

  serializeHash : {
    outing : function(record, json) {
      return json;
    },

    "person-event" : function(record, json) {
      json.person = record.get("person.id");
      json.event = record.get("event.id");
      return json;
    },

    person : function(record, json) {
      return json;
    },

    "event-person" : function(record, json) {
      json.person = record.get("person.id");
      json.event = record.get("event.id");
      json.toPay = record.get("toPay");
      json.paid = record.get("paid");
      return json;
    },

    event : function(record, json) {
      return json;
    },
  },

  serializeHasMany : function(record, json, relationship) {
    var key = relationship.key;

    var relationshipType = DS.RelationshipChange.determineRelationshipType(record.constructor, relationship);

    json[key] = record.get(key);
    if (relationshipType === 'manyToNone' || relationshipType === 'manyToMany') {
      json[key] = json[key].mapBy('id');
    }
    else if (relationshipType === 'manyToOne') {
      json[key] = json[key].map(function(r) {
        return this.serialize(r, {});
      }, this);
    }
  },

  serializeBelongsTo: function(record, json, relationship) {
    //do nothing!
  },

  typeForRoot : function(root) {
    if(/data$/.test(root)) {
      return root;
    }
    return Ember.String.singularize(root);
  }
});

CrudAdapter.getId = function(record, type) {
  var id = record.id;
  if(!id) {
    var keys = type.keys || [], ids = [];
    for(var i = 0; i < keys.length; i++) {
      ids.push((record.get && record.get(keys[i])) || record[keys[i]]);
    }
    return ids.join("__");
  }
  else {
    return id;
  }
};

CrudAdapter.backupDataMap = {};
CrudAdapter.backupData = function(record, type, create) {
  //TODO : make 'new' into a custom new tag extracted from 'type'
  var data = record.toJSON(), id = (!create && CrudAdapter.getId(record, type)) || (create && "new");
  CrudAdapter.backupDataMap[type.typeKey] = CrudAdapter.backupDataMap[type.typeKey] || {};
  CrudAdapter.backupDataMap[type.typeKey][id] = data;
  if(type.retainId) data.id = id;
  for(var i = 0; i < type.keys.length; i++) {
    if(Ember.isEmpty(data[type.keys[i]])) delete data[type.keys[i]];
  }
  type.eachRelationship(function(name, relationship) {
    var a = record.get(relationship.key);
    if(a) {
      if(relationship.kind == 'hasMany') {
        this.data[relationship.key] = [];
        a.forEach(function(item) {
          this.data[relationship.key].push(CrudAdapter.backupData(item, relationship.type));
        }, this);
      }
      else if(relationship.kind === "belongsTo") {
        this.data[relationship.key] = a.get("id");
      }
    }
  }, {data : data, record : record});
  if(CrudAdapter.customBackup[type.typeKey]) {
    CrudAdapter.customBackup[type.typeKey](record, type, data);
  }
  return data;
};

CrudAdapter.retrieveBackup = function(hash, type, hasId) {
  var id = (hasId && CrudAdapter.getId(hash, type)) || "new";
  if(CrudAdapter.backupDataMap[type.typeKey] && CrudAdapter.backupDataMap[type.typeKey][id]) {
    var data = CrudAdapter.backupDataMap[type.typeKey][id];
    delete CrudAdapter.backupDataMap[type.typeKey][id];
    Ember.merge(hash, data);
    type.eachRelationship(function(name, relationship) {
      if(relationship.kind === "hasMany") {
        var da = this.data[relationship.key], ha = this.hash[relationship.key];
        if(da) {
          for(var i = 0; i < da.length; i++) {
            var ele = ha.findBy(relationship.type.keys[0], da[i][relationship.type.keys[0]]);
            da[i].id = CrudAdapter.getId(da[i], relationship.type);
            if(ele) Ember.merge(ele, da[i]);
            else ha.push(da[i]);
          }
        }
      }
    }, {data : data, hash : hash});
  }
  if(CrudAdapter.customRetrieve[type.typeKey]) {
    CrudAdapter.customRetrieve[type.typeKey](hash, type, data);
  }
  return hash;
};

CrudAdapter.customBackup = {
  "person-event" : function(record, type, data) {
  },
};

CrudAdapter.customRetrieve = {
};

CrudAdapter.saveRecord = function(record, type) {
  return new Ember.RSVP.Promise(function(resolve, reject) {
    if(record.get("validationFailed")) {
      reject("Validation Failed. Check all fields.");
    }
    if(!record.get("isDeleted")) {
      record.eachAttribute(function(attr) {
        var val = this.get(attr);
        if(Ember.typeOf(val) === "string") {
          val = val.replace(/^\s*/, "");
          val = val.replace(/\s*$/, "");
          this.set(attr, val);
        }
      }, record);
    }
    //if(record.get("isDirty")) {
      new Ember.RSVP.Promise(function(resolve, reject) {
        record.save().then(function(data) {
          resolve(data);
        }, function(message) {
          record.rollback();
          reject(message.message || message.statusText || message);
        });
      }).then(function(data) {
        resolve(data);
        if(!record.get("isDeleted")) {
          record.eachRelationship(function(name, relationship) {
            if(relationship.kind === "hasMany") {
              var hasManyArray = record.get(relationship.key);
              for(var i = 0; i < hasManyArray.get("length");) {
                var item = hasManyArray.objectAt(i);
                if(item.get("isNew")) {
                  hasManyArray.removeObject(item);
                  item.unloadRecord();
                }
                else {
                  i++;
                }
              }
            }
          }, record);
        }
      }, function(message) {
        reject(message.message || message.statusText || message);
      });
    /*}
    else {
      resolve(record);
    }*/
  });
};

CrudAdapter.forceReload = function(store, type, id) {
  if(store.recordIsLoaded(type, id)) {
    var record = store.recordForId(type, id);
    return record.reload();
  }
  else {
    return store.find(type, id);
  }
};
