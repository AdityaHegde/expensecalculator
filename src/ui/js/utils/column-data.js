ColumnData = Ember.Namespace.create();
ColumnData.ColumnValidation = Ember.Object.extend({
  type : 0,
  regex : "",
  regexFlags : "",
  regexObject : function() {
    return new RegExp(this.get("regex"), this.get("regexFlags"));
  }.property('regex'),
  invalidMessage : "",
  negate : false,

  validateValue : function(value) {
    var type = this.get("type"), invalid = false, negate = this.get("negate"),
        emptyRegex = new RegExp("^\\s*$");
    switch(type) {
      case 0:  invalid = Ember.isEmpty(value); invalid = invalid || emptyRegex.test(value); break;
      case 1:  invalid = this.get("regexObject").test(value); break;
      case 2:  invalid = !Date.parse(value); break;
      default: invalid = true;
    }
    invalid = (negate && !invalid) || (!negate && invalid);
    return [invalid, this.get("invalidMessage")];
  },
});

ColumnData.ColumnData = Ember.Object.extend({
  name : "",
  label : "",
  placeholder : null,
  placeholderActual : function() {
    var placeholder = this.get("placeholder"), label = this.get("label");
    if(placeholder) return placeholder;
    return label;
  }.property('label', 'placeholder'),
  type : "",
  childCol : Utils.belongsTo(ColumnData.ColumnData),
  fixedValue : null,
  options : [],
  data : [],
  dataValCol : "",
  dataLabelCol : "",
  validations : Utils.hasMany(ColumnData.ColumnValidation),
  validate : Ember.computed.notEmpty('validations'),
  validateValue : function(value) {
    var validations = this.get("validations"), invalid = [false, ""];
    for(var i = 0; i < validations.length; i++) {
      invalid = validations[i].validateValue(value);
      if(invalid[0]) break;
    }
    return invalid;
  },
  mandatory : Ember.computed('validations.@each.type', function() {
    var validations = this.get("validations"), isMandatory = false;
    if(validations) {
      validations.forEach(function(item) {
        isMandatory = isMandatory || item.get("type") == 0;
      });
    }
    return isMandatory;
  }),
});
