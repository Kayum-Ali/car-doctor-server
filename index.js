const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");


const cors = require("cors");
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cookieParser = require("cookie-parser");
// middleware
require("dotenv").config();
app.use(cors({
  origin: ['http://localhost:5173/'],
  credentials : true
}));
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Car doctor server is Running");
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dangeag.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const database = client.db("carDoctor");
    const servicesCollection = database.collection("services");
    const bookingsCollection = database.collection("bookings");

    // auth releted api
    app.post("/jwt", async (req, res) => {
      const user = req.body;

      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET,{ expiresIn: "1h" }
      );
      res
      .cookie('token', token, {
        httpOnly: true,
        secure: false,
        sameSite: 'none'
      })
      .send({success: true})
    });
    // services collection
    app.get("/services", async (req, res) => {
      const services = await servicesCollection.find().toArray();
      res.send(services);
    });

    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await servicesCollection.findOne(query);
      res.send(result);
    });
    app.get("/checkout/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const options = {
        projection: {
          title: 1,
          img: 1,
          price: 1,
          service_id: 1,
        },
      };
      const result = await servicesCollection.findOne(query, options);
      res.send(result);
    });

    // bookings

    app.get("/bookings", async (req, res) => {
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }
      const bookings = await bookingsCollection.find(query).toArray();
      res.send(bookings);
    });
    app.post("/bookings", async (req, res) => {
      const newBooking = req.body;

      const result = await bookingsCollection.insertOne(newBooking);
      res.send(result);
    });

    app.delete("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const result = await bookingsCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, (req, res) => {
  console.log(`Server is running on port ${port}`);
});
