EditableTable = {};

EditableTable.EditRowView = Ember.ContainerView.extend({
  init : function() {
    this._super();
    var cols = this.get('cols'), row = this.get('row');
    for(var i = 0; i < cols.length; i++) {
      if(cols[i].disableOnEdit && !row.get("isNew")) {
        cols[i].disabled = true;
      }
      else {
        cols[i].disabled = false;
      }
      this.pushObject(EditableTable.TypeToCellMap[cols[i].type].create({
        col : cols[i],
        cols : cols,
        row : row,
        labelWidthClass : this.get("labelWidthClass"),
        inputWidthClass : this.get("inputWidthClass"),
        tagName : this.get("childTagNames"),
        showLabel : this.get("showLabel"),
      }));
    }
  },

  childTagNames : 'div',
  classNames : ['form-horizontal'],
  row : null,
  cols : null,
  labelWidthClass : "col-sm-3",
  inputWidthClass : "col-sm-9",
  showLabel : true,
});

EditableTable.EditCellTextInputView = Ember.View.extend({
  init : function() {
    this._super();
    this.rowDidChange();
  },

  layout : Ember.Handlebars.compile('' +
    '{{#if view.showLabel}}<label {{bind-attr for="view.col.name" class="view.labelClass"}}>{{view.col.label}}{{#if view.col.mandatory}}*{{/if}}</label>{{/if}}' +
    '<div {{bind-attr class="view.inputClass"}}>' +
      '{{yield}}' +
      '{{#if view.invalid}}' +
        '<span class="glyphicon glyphicon-remove form-control-feedback"></span>' +
        '{{#if view.invalidReason}}<span class="help-block text-danger">{{view.invalidReason}}</span>{{/if}}' +
      '{{/if}}' +
    '</div>'),
  template : Ember.Handlebars.compile('{{input class="form-control" type="text" value=view.val disabled=view.col.fixedValue placeholder=view.col.placeholderActual maxlength=view.col.maxlength}}'),
  classNames : ['form-group'],
  classNameBindings : ['invalid:has-error', ':has-feedback', 'col.disabled:hidden'],
  col : null,
  cols : null,
  row : null,
  labelWidthClass : "col-sm-3",
  inputWidthClass : "col-sm-9",
  showLabel : true,
  labelClass : function() {
    var col = this.get("col"), labelWidthClass = this.get("labelWidthClass");
    return "control-label "+(col.labelWidthClass || labelWidthClass);
  }.property('view.col', 'view.labelWidthClass'),
  inputClass : function() {
    var col = this.get("col"), inputWidthClass = this.get("inputWidthClass");
    return "control-input "+(col.inputWidthClass || inputWidthClass);
  }.property('view.col', 'view.inputWidthClass'),

  invalid : false,
  invalidReason : false,

  validateValue : function(value) {
    var col = this.get("col"), row = this.get("row");
    if(col.get("validate") && !col.get("disabled")) {
      var validVal = col.validateValue(value);
      if(validVal[0]) row._validation[col.name] = 1;
      else delete row._validation[col.name];
      this.set("invalid", validVal[0]);
      this.set("invalidReason", !Ember.isEmpty(validVal[1]) && validVal[1]);
    }
    else {
      delete row._validation[col.name];
    }
    var validationFailed = false;
    for(var c in row._validation) {
      validationFailed = true;
    }
    row.set("validationFailed", validationFailed);
  },

  //Works as both getter and setter
  val : function(key, value) {
    var col = this.get("col"), row = this.get("row");
    row._validation = row._validation || {};
    if(arguments.length > 1) {
      this.validateValue(value);
      row.set(col.name, value);
      return value;
    }
    else {
      value = row.get(col.name);
      this.validateValue(value);
      return value;
    }
  }.property('col', 'col.disabled'),

  prevRow : null,
  rowDidChange : function() {
    var row = this.get("row"), prevRow = this.get("prevRow"),
        col = this.get("col");
    if(prevRow) {
      Ember.removeObserver(prevRow, col.name, this, "notifyValChange");
    }
    Ember.addObserver(row, col.name, this, "notifyValChange");
    this.set("prevRow", row);
    this.notifyPropertyChange("val");
  }.observes("view.row", "row"),
  title : "test",

  notifyValChange : function(obj, val) {
    this.notifyPropertyChange("val");
  },
});

EditableTable.EditCellTextAreaView = EditableTable.EditCellTextInputView.extend({
  template : Ember.Handlebars.compile('{{textarea class="form-control" value=view.val disabled=view.col.fixedValue rows=view.col.rows cols=view.col.cols placeholder=view.col.placeholderActual ' +
                                                                      'maxlength=view.col.maxlength readonly=view.col.readonly}}'),
});

EditableTable.EditCellStaticSelectView = EditableTable.EditCellTextInputView.extend({
  template : Ember.Handlebars.compile('{{view Ember.Select class="form-control" content=view.col.options optionValuePath="content.val" optionLabelPath="content.label" ' +
                                                                               'prompt=view.col.prompt value=view.val disabled=view.col.fixedValue maxlength=view.col.maxlength}}' +
                                      '{{#if view.helpblock}}<p class="help-block">{{view.helpblock}}</p>{{/if}}'),

  helpblock : "",

  enableDisableFields : function(value) {
    var col = this.get("col"), cols = this.get("cols");
    var col = this.get("col"), cols = this.get("cols"), opts = col.get("options");
    if(opts) {
      var selected = -1;
      for(var j = 0; j < opts.length; j++) {
        var enableFields = opts[j].enableFields,
            valEq = value == opts[j].val;
        if(valEq) {
          selected = j;
          this.set("helpblock", opts[j].helpblock || "");
        }
        else {
          if(enableFields) {
            for(var k = 0; k < enableFields.length; k++) {
              var ec = cols.findBy("name", enableFields[k].name);
              ec.set("disabled", (enableFields[k].enable && !valEq) || (enableFields[k].disable && valEq));
            }
          }
        }
      }
      if(selected >= 0) {
        var enableFields = opts[selected].enableFields;
        if(enableFields) {
          for(var k = 0; k < enableFields.length; k++) {
            var ec = cols.findBy("name", enableFields[k].name);
            ec.set("disabled", !enableFields[k].enable || enableFields[k].disable);
          }
        }
      }
    }
  },

  val : function(key, value) {
    var col = this.get("col"), row = this.get("row");
    row._validation = row._validation || {};
    if(arguments.length > 1) {
      this.validateValue(value);
      this.enableDisableFields(value);
      row.set(col.name, value);
      return value;
    }
    else {
      value = row.get(col.name);
      this.validateValue(value);
      this.enableDisableFields(value);
      return value;
    }
  }.property('col', 'col.disabled'),
});

//psuedo dynamic : takes options from records
EditableTable.EditCellDynamicSelectView = EditableTable.EditCellTextInputView.extend({
  selectOptions : function() {
    var col = this.get("col"), data = [], opts = [];
    if(col.dataPath) {
      data = Ember.get(col.dataPath);
    }
    else {
      data = col.data || [];
    }
    data.forEach(function(item) {
      opts.push({ val : item.get(col.dataValCol), label : item.get(col.dataLabelCol)});
    }, this);
    return opts;
  }.property('view.col'),

  template : Ember.Handlebars.compile('{{view Ember.Select class="form-control" content=view.selectOptions optionValuePath="content.val" optionLabelPath="content.label" '+
                                                                               'prompt=view.col.prompt value=view.val disabled=view.col.fixedValue maxlength=view.col.maxlength}}'),
});

EditableTable.EditCellSelectiveSelectView = Ember.Select.extend({
  options : [],
  filterColumn : "",
  content : function() {
    var filterColumn = this.get("filterColumn");
    return this.get("options").filter(function(item) {
      return !Ember.isEmpty(item.get(this.filterColumn));
    }, {filterColumn : filterColumn});
  }.property('view.overallOptions.@each'),
});

EditableTable.EditCellLabel = Ember.View.extend({
  classNameBindings : ['col.disabled:hidden'],
  template : Ember.Handlebars.compile('{{view.col.label}}'),
  col : null,
  cols : null,
  row : null,
});

EditableTable.EditCellLegend = Ember.View.extend({
  classNameBindings : ['col.disabled:hidden'],
  template : Ember.Handlebars.compile('<legend>{{view.col.label}}</legend>'),
  col : null,
  cols : null,
  row : null,
});

EditableTable.EditCellFileUpload = EditableTable.EditCellTextInputView.extend({
  template : Ember.Handlebars.compile('<button class="btn btn-default" {{action "loadFile" target="view"}} {{bind-attr disabled="view.disableBtn"}}>{{view.col.btnLabel}}</button>' +
                                      '<input class="hidden" type="file" name="files[]" {{bind-attr accept="view.col.accept"}}>'),

  disableBtn : false,

  postRead : function(data) {
    that.set("val", data);
  },

  postFail : function(message) {
    that.set("val", null);
  },

  change : function(event) {
    var files = event.originalEvent.target.files, that = this, col = this.get("col");
    if(files && files.length > 0 && !Ember.isEmpty(files[0])) {
      this.set("disableBtn", "disabled");
      EmberFile[col.get("method")](files[0]).then(function(data) {
        that.postRead(data);
        that.set("disableBtn", false);
      }, function(message) {
        that.postFail(message);
        that.set("disableBtn", false);
      });
      $(this.get("element")).find("input[type='file']")[0].value = "";
    }
  },

  actions : {
    loadFile : function() {
      fileInput = $(this.get("element")).find("input[type='file']");
      fileInput.click();
    },
  },
});

EditableTable.EditCellImageUpload = EditableTable.EditCellFileUpload.extend({
  template : Ember.Handlebars.compile('<p><button class="btn btn-default btn-sm" {{action "loadFile" target="view"}} {{bind-attr disabled="view.disableBtn"}}>{{view.col.btnLabel}}</button>' +
                                      '<input class="hidden" type="file" name="files[]" {{bind-attr accept="view.col.accept"}}></p>' +
                                      '<canvas class="hidden"></canvas>' +
                                      '<div {{bind-attr class="view.hasImage::hidden"}}>' +
                                        '<div class="image-container">' +
                                          '<div class="image-container-inner">' +
                                            '<img class="the-image" {{bind-attr src="view.imageSrc"}}>' +
                                            '<div class="image-cropper"></div>' +
                                          '</div>' +
                                        '</div>' +
                                        '<button class="btn btn-default btn-sm" {{action "cropImage" target="view"}}>Crop</button>' +
                                      '</div>' +
                                      '<div class="clearfix"></div>'),

  imageSrc : "",
  hasImage : false,

  postRead : function(data) {
    this.set("imageSrc", data);
    this.set("hasImage", true);
  },

  postFail : function(message) {
    this.set("imageSrc", null);
    this.set("hasImage", false);
  },

  didInsertElement : function() {
    this._super();
    var cropper = $(this.get("element")).find(".image-cropper");
    cropper.draggable({
      containment: "parent",
    });
    cropper.resizable({
      containment: "parent",
    });
  },

  actions : {
    cropImage : function() {
      var cropper = $(this.get("element")).find(".image-cropper"),
          x = cropper.css("left"), y = cropper.css("top"),
          h = cropper.height(), w = cropper.width(),
          canvas = $(this.get("element")).find("canvas")[0],
          context = canvas.getContext("2d");
      x = Number(x.match(/^(\d+)px$/)[1]);
      y = Number(y.match(/^(\d+)px$/)[1]);
      context.drawImage($(this.get("element")).find(".the-image")[0], x, y, h, w, 0, 0, h, w);
      this.set("val", canvas.toDataURL());
      this.set("hasImage", false);
      cropper.css("left", 0);
      cropper.css("top", 0);
      cropper.height(100);
      cropper.width(100);
    },
  },

});

EditableTable.EditCellMultiEntry = EditableTable.EditCellTextInputView.extend({
  childView : function() {
    var col = this.get("col");
    return EditableTable.TypeToCellMap[col.get("childCol").type];
  }.property("view.col.childCol.type"),
  template : Ember.Handlebars.compile('' +
    '{{#each view.val}}' +
      '<div>' +
        '<div class="col-md-10">{{create-view view.childView row=this col=view.col.childCol showLabel=false}}</div>' +
        '<div class="col-md-2"><a class="btn btn-link btn-sm" {{action "deleteEntry" this target="view"}}>' +
          '{{#tool-tip title="Delete Entry"}}<span class="glyphicon glyphicon-trash"></span>{{/tool-tip}}' +
        '</a></div>' +
        '<div class="clearfix"></div>' +
      '</div>' +
    '{{/each}}' +
    '<button class="btn btn-default btn-sm" {{action "addEntry" target="view"}}>Add Entry</button>'),

  actions : {
    addEntry : function() {
      var row = this.get("row"), col = this.get("col"),
          entry, val = this.get("val");
      if(row.addEntryHook) {
        entry = row.addEntryHook(col.name);
      }
      else {
        entry = Ember.Object.create();
      }
      if(!val) {
        val = [];
        this.set("val", val);
      }
      val.pushObject(entry);
    },

    deleteEntry : function(entry) {
      var val = this.get("val");
      val.removeObject(entry);
    },
  },
});

EditableTable.EditCellCheckBox = EditableTable.EditCellTextInputView.extend({
  template : Ember.Handlebars.compile('<div class="checkbox"><label>{{view Ember.Checkbox checked=view.val disabled=view.col.fixedValue}} {{view.col.checkboxLabel}}</label></div>'),

  enableDisableFields : function(value) {
    var col = this.get("col"), cols = this.get("cols"),
        enableFields = col.get("enableFields");
    if(enableFields) {
      for(var i = 0; i < enableFields.length; i++) {
        var ec = cols.findBy("name", enableFields[i].name);
        ec.set("disabled", (enableFields[i].enable && !value) || (enableFields[i].disable && !!value));
      }
    }
  },

  val : function(key, value) {
    var col = this.get("col"), row = this.get("row");
    row._validation = row._validation || {};
    if(arguments.length > 1) {
      this.validateValue(value);
      this.enableDisableFields(value);
      row.set(col.name, value);
      return value;
    }
    else {
      value = row.get(col.name);
      this.validateValue(value);
      this.enableDisableFields(value);
      return value;
    }
  }.property('col', 'col.disabled'),
});

EditableTable.TypeToCellMap = {
  textInput : EditableTable.EditCellTextInputView,
  textareaInput : EditableTable.EditCellTextAreaView,
  staticSelect : EditableTable.EditCellStaticSelectView,
  dynamicSelect : EditableTable.EditCellDynamicSelectView,
  selectiveSelect : EditableTable.EditCellSelectiveSelectView,
  label : EditableTable.EditCellLabel,
  fileUpload : EditableTable.EditCellFileUpload,
  imageUpload : EditableTable.EditCellImageUpload,
  multiEntry : EditableTable.EditCellMultiEntry,
  checkBox : EditableTable.EditCellCheckBox,
};
