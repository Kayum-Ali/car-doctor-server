const express = require("express");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const port = process.env.PORT || 50;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const cookieParser = require("cookie-parser");

const app = express();
const corsOptions = {
  origin: [
    'http://localhost:5174',
    'genial-theory-434606-u4.web.app',
  ],
  credentials: true,
  optionSuccessStatus: 200,
}
// middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  res.send("Mechanic server is Running");
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




const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: "Access denied No token provided" })
  }
   jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if(err){
      
      return res.status(401).send({message: "unAuthoerize"})
    }
    req.user = decoded;
    next();
});

}
async function run() {
  try {
    await client.connect();
    const database = client.db("carDoctor");
    const servicesCollection = database.collection("services");
    const bookingsCollection = database.collection("bookings");

    //auth related api
    app.post("/jwt" , async (req, res)=>{
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "365d",
      });

      res.cookie('token', token, {
        httpOnly: true,
        secure:process.env.NODE_ENV === 'production', 
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',  
      }).send({ success: true })
    })

    app.post("/logout",  (req, res)=>{
      res.clearCookie('token',{maxAge: 0}).send({ success: true })
    })


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
    app.get("/bookings",verifyToken, async (req, res) => {
      if(req?.query?.email !== req?.user?.email){
        return res.status(401).send({ message: "Forbidden Access" })
      }
      let query = {};
      if (req.query?.email) {
        query = { email: req?.query.email };
      }
      const bookings = await bookingsCollection.find(query).toArray();
      res.send(bookings);
    });


    app.post("/bookings",  async (req, res) => {
      const newBooking = req.body;
      const result = await bookingsCollection.insertOne(newBooking);
      res.send(result);
    });

    app.patch("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const updatedBooking = req.body;
      console.log(updatedBooking)
      const query = { _id: new ObjectId(id) };
      const filter = {
        $set: {
          status : updatedBooking.status
        }
      }
      const result = await bookingsCollection.updateOne(query, filter);
      res.send(result);
    })


    app.delete("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const result = await bookingsCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });


    
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
   
  }
}
run().catch(console.dir);

app.listen(port, (req, res) => {
  console.log(`Server is running on port ${port}`);
});
