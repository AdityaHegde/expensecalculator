SCRIPTS_PATH = build/scripts
MINIFY_SCRIPT = $(SCRIPTS_PATH)/minifyFilesAndMerge.pl
REPLACE_SCRIPT_TAGS = $(SCRIPTS_PATH)/replaceScriptTags.pl

INDEX_PATH = src/ui/index.html
MINIFIED_APP_JS = ember-app.js

PY_PROD_PATH = prod/python
PY_PROD_UI_PATH = $(PY_PROD_PATH)/public
PY_PROD_UI_LIB_PATH = $(PY_PROD_UI_PATH)/libs

JS_SRC_PATH = src/ui/js/
JS_SRC_LIB_PATH = $(addprefix $(JS_SRC_PATH), libs/)
JS_SRC_FILES = utils.js app.js controllers.js objects.js routes.js
JS_SRC_LIB_FILES = jquery-1.10.2.js handlebars-1.1.2.js ember.js ember-data.js bootstrap.js
JS_OP_FILES = $(JS_SRC_FILES:%.js=%.min.js)

CSS_SRC_PATH = src/ui/css/
CSS_SRC_FILES = normalize.css bootstrap.css bootstrap-theme.css style.css
CSS_OP_FILES = $(CSS_SRC_FILES:%.css=%.min.css)

MINIFY_COMMAND = java
MINIFY_COMMAND_FLAGS = -jar build/yuicompressor-2.4.8.jar

%.min.js : $(JS_SRC_PATH)%.js
	$(MINIFY_COMMAND) $(MINIFY_COMMAND_FLAGS) $^ > $@

%.min.css : $(CSS_SRC_PATH)%.css
	$(MINIFY_COMMAND) $(MINIFY_COMMAND_FLAGS) $^ > $@

#ls -tr to maintain the order
$(MINIFIED_APP_JS) : $(JS_OP_FILES)
	ls -tr $^ | perl -n $(MINIFY_SCRIPT) > $@

index.html : $(INDEX_PATH)
	perl $(REPLACE_SCRIPT_TAGS) $(INDEX_PATH) $(MINIFIED_APP_JS) $(JS_SRC_FILES) > $@

$(PY_PROD_PATH) :
	mkdir -p $(PY_PROD_PATH)

$(PY_PROD_UI_PATH) :
	mkdir -p $(PY_PROD_UI_PATH)

$(PY_PROD_UI_LIB_PATH) :
	mkdir -p $(PY_PROD_UI_LIB_PATH)

build : build-python build-static-lib build-static
.PHONY : build

build-python : $(wildcard src/python/*) | $(PY_PROD_PATH)
	cp $^ $(PY_PROD_PATH)
.PHONY : build-python

build-static-lib : $(addprefix $(JS_SRC_LIB_PATH), $(JS_SRC_LIB_FILES)) | $(PY_PROD_UI_LIB_PATH)
	cp $^ $(PY_PROD_UI_LIB_PATH)/
.PHONY : build-static-lib

build-static : build-static-js build-static-css build-static-index
.PHONY : build-static

build-static-index : index.html | $(PY_PROD_UI_PATH)
	cp $^ $(PY_PROD_UI_PATH)
.PHONY : build-static-index

build-static-js : $(MINIFIED_APP_JS) | $(PY_PROD_UI_PATH)
	cp $^ $(PY_PROD_UI_PATH)
.PHONY : build-static-js

build-static-css : $(CSS_OP_FILES) | $(PY_PROD_UI_PATH)
	cp $^ $(PY_PROD_UI_PATH)
.PHONY : build-static-css

DEPLOY_CMD = appcfg.py
DEPLOY_CMD_FLAGS = update

deploy : build
	$(DEPLOY_CMD) $(DEPLOY_CMD_FLAGS) $(PY_PROD_PATH)
.PHONY : deploy

clean : 
	rm *.js *.css index.html
.PHONY : clean
