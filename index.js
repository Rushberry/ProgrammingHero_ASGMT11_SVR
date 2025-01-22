require("dotenv").config();
const express = require('express')
const cors = require('cors')
// const jwt = require('jsonwebtoken');
const app = express()
const { MongoClient, ServerApiVersion, ObjectId, ServerDescription } = require('mongodb');
const port = process.env.PORT || 2025;

// Middleware
app.use(cors())
app.use(express.json())

// MongoDB 
const username = process.env.DB_USER;
const password = process.env.DB_PASS;
const uri = `mongodb+srv://${username}:${password}@user-management-server.kivdz.mongodb.net/?retryWrites=true&w=majority&appName=User-Management-Server`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});


async function run() {
    try {
        // await client.connect();
        const database = client.db("AuraDriveDB");
        const carBase = database.collection("cars");

        // GET APIS
        app.get('/', (req, res) => {
            res.send('Aura Drive: Your gateway to premium car rentals, offering a seamless experience to explore, rent, and enjoy luxury and performance vehicles. Drive the extraordinary with ease.')
        })

        app.get('/availableCars', async (req, res) => {
            const query = { availability: true }
            const result = await carBase.find(query).toArray()
            res.send(result)
        })

        app.get('/allCars', async (req, res) => {
            const result = await carBase.find().toArray()
            res.send(result)
        })

        app.get('/cars/search', async (req, res) => {
            const q = req.query.q;
            console.log(q)
            const query = { location: { $regex: `\\b${q}`, $options: 'i' }, availability: true }
            const result = await carBase.find(query).toArray()
            res.send(result)
        })
        
        app.get('/car/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await carBase.find(query).toArray()
            res.send(result)
        })
        
        // POST APIS
        app.post('/addCar', async (req, res) => {
            const response = req.body;
            const result = await carBase.insertOne(response)
            res.send(result)
        })




        // await client.db("admin").command({ ping: 1 });
        // console.log("Connected to MongoDB <3");
    } finally {
        // await client.close();
    }
}
run().catch(console.dir);


app.listen(port, () => {
    console.log(`Server is running at PORT: ${port}`)
})