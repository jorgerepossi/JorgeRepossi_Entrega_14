/* eslint-disable no-unused-vars */
/**
 * Entrega 15 - Clase 30
 * 30. PROXY & NGINX
 * Alumno: Jo Repossi
 * Backend: NodeJS
 * Comisión 30995
 * Profesor: Diego Jofre
 * Fecha: Martes 06 Septiembre 2022
 */

const express = require("express");
const path = require("path");

const { Server: HttpServer } = require("http");
const { Server: IOServer } = require("socket.io");

const connectMongo = require("connect-mongo");
const session = require("express-session");
const exphbs = require("express-handlebars");

require("dotenv").config(".env");
const parse = require("yargs/yargs");
const process = require("process");


const  { fork } = require("child_process");
const  cluster = require("cluster"); 
const  os = require( "os");


const productsController = require("./src/controller/productController");
const messagesController = require("./src/controller/messageController");

const options = { useNewUrlParser: true, useUnifiedTopology: true };
const MongoStore = connectMongo.create({
  mongoUrl: process.env.MONGO_URL,
  mongoOptions: options,
  ttl: 60,
});

const numCPUs = os.cpus().length;
const yargs = parse(process.argv.slice(2));
const { port, mode, _ } = yargs
	.boolean("debug")
	.alias({
		m: "mode",
		p: "port",
		// d: 'debug'
	})
	.default({
		mode: "FORK",
		port: 8080,
		// debug: false
	}).argv;

/* MASTER ---------------------------------------*/
if (mode === "CLUSTER" && cluster.isPrimary) cluster_mode();

function cluster_mode() {
	console.log(numCPUs);
	console.log(`PID MASTER ${process.pid}`);

	for (let i = 0; i < numCPUs; i++) {
		cluster.fork();
	}

	cluster.on("exit", (worker) => {
		console.log("Worker", worker.process.pid, "died", new Date().toLocaleString());
		cluster.fork();
	});

	return false;
}

const server_info = {
  arguments: process.argv.slice(2),
  os: process.env.os,
  node_version: process.versions.node,
  memory_usage: process.memoryUsage().rss,
  exec_path: process.execPath,
  process_id: process.pid,
  current_working_directory: process.cwd(),
};
const app = express();

const httpServer = new HttpServer(app);
const io = new IOServer(httpServer);

app.set("view engine", "handlebars");

// eslint-disable-next-line no-undef
app.set("views", path.join(__dirname + "/public/views"));

app.engine("handlebars", exphbs.engine());

app.use(express.json());
app.use(express.urlencoded({ extend: true }));

// eslint-disable-next-line no-undef
app.use(express.static(__dirname + "/public"));

app.use(
  session({
    store: MongoStore,
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

app.use("/", require("./src/routes/login"));
app.use("/api/randoms", require("./src/routes/random"));

app.get("/info", (req, res) => {
  res.json(server_info);
});


io.on("connection", (socket) => {
  socket.emit("socketConnected");

  socket.on("productListRequest", async () => {
    const allProducts = await productsController.getAllProducts();
    socket.emit("updateProductList", allProducts);
  });

  socket.on("chatMessagesRequest", async () => {
    const allMessages = await messagesController.getAllMessages();
    socket.emit("updateChatRoom", allMessages);
  });

  socket.on("addNewProduct", async (newProduct) => {
    await productsController.addNewProduct(newProduct);
    const allProducts = await productsController.getAllProducts();
    socket.emit("updateProductList", allProducts);
  });

  socket.on("addNewMessage", async (newMessage) => {
    await messagesController.addNewMessage(newMessage);
    const allMessages = await messagesController.getAllMessages();
    socket.emit("updateChatRoom", allMessages);
  });
});

const PORT = port;
const server = httpServer.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
server.on("error", (err) => console.error(err));
