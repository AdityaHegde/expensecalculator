#!/usr/bin/env node

var express = require("express"),
    dataHandler = require("data_handler"),
    app = express();

app.configure(function(){
  app.use(express.bodyParser());
});

app.get("/data", dataHandler.handlerGet);
app.post("/data", dataHandler.handlerPost);

app.use("/", express.static('./public'));

app.listen(8080);
