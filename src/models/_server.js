const express = require("express");
const cors = require("cors");

const { Server: HttpServer } = require("http");
const { Server: IOServer } = require("socket.io");
const connectMongo = require("connect-mongo");
const session = require("express-session");

const productsController = require("../controller/productController");
const messagesController = require("../controller/messageController");

const exphbs = require("express-handlebars");

class Server {
  constructor() {
    this.app = express();
    this.port = 8080;
    this.server = require("http").createServer(this.app);
    this.httpServer = new HttpServer(this.app);
    this.io = new IOServer(this.httpServer);

    // middleware
    this.middleware();

    // config
    this.config();

    // routes
    this.routes();

    // socket
    this.socket();
  }

  config() {
    const options = { useNewUrlParser: true, useUnifiedTopology: true };
    const MongoStore = connectMongo.create({
      mongoUrl:
        "mongodb+srv://coder:coder123@coder.ljncabt.mongodb.net/?retryWrites=true&w=majority",
      mongoOptions: options,
      ttl: 60,
    });

    this.app.use(
      session({
        store: MongoStore,
        secret: "secretpass",
        resave: false,
        saveUninitialized: false,
      })
    );
  }

  middleware() {
    // Directorio publico

    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(express.static(__dirname + "/public"));
    this.app.use(express.json());
    this.app.use(cors());
  }

  routes() {
    this.app.use("/", require("../routes/login"));
    this.app.use("/products", require("../routes/products"));
  }

  socket() {
    this.io.on("connection", (socket) => {
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
  }

  listen() {
    const server = this.httpServer.listen(this.port, () => {
      console.log(`Listening on port ${this.port}`);
    });
    server.on("error", (err) => console.error(err));
  }
}

module.exports = Server;
