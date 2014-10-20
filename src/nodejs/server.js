var express = require("express"),
    dataHandler = require("data_handler"),
    app = express();

app.configure(function(){
  app.use(express.bodyParser());
});

app.get("/profile/get", dataHandler.handlerGet);
app.get("/outing/get", dataHandler.handlerGet);
app.post("/outing/create", dataHandler.handlerCreate);
app.post("/outing/update", dataHandler.handlerUpdate);
app.post("/person/create", dataHandler.handlerCreate);
app.post("/person/update", dataHandler.handlerUpdate);
app.post("/event/create", dataHandler.handlerCreate);
app.post("/event/update", dataHandler.handlerUpdate);

app.use("/", express.static('./public'));

app.listen(parseInt(process.env.OPENSHIFT_NODEJS_PORT) || 8080, process.env.OPENSHIFT_NODEJS_IP || "127.0.0.1");
