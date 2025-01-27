require("dotenv").config();
const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const app = express()
const { MongoClient, ServerApiVersion, ObjectId, ServerDescription } = require('mongodb');
const port = process.env.PORT || 2025;

// Middleware
app.use(cors({
    origin: ['http://localhost:5173', 'https://auradrive.surge.sh'],
    credentials: true
}))
app.use(express.json())
app.use(cookieParser())


const verifyToken = (req, res, next) => {
    const token = req.cookies.token
    // console.log(token)
    if(!token){
        return res.status(401).send({message: 'Unauthorized Access : No Token'});
    }

    // Token Verification
    jwt.verify(token, process.env.SECRET_TOKEN, (err, decoded) => {
        if(err){
            return res.status(401).send({message: 'Unauthorized Access'});
        }
        req.user = decoded;
        next()
    })
}
// MongoDB 
const username = process.env.DB_USER;
const password = process.env.DB_PASS;
const secret = process.env.SECRET_TOKEN;
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
        const bookingBase = database.collection("bookings");

        // JWT PowerHouse
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.SECRET_TOKEN, { expiresIn: '10h' })
            res
                .cookie('token', token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production",
                })
                .send({ success: true })
        })

        app.post('/logout', async (req, res) => {
            res
                .clearCookie('token', {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production",
                })
                .send({ success: true })
        })


        // GET APIS
        app.get('/', (req, res) => {
            res.send('Aura Drive: Your gateway to premium car rentals, offering a seamless experience to explore, rent, and enjoy luxury and performance vehicles. Drive the extraordinary with ease.')
        })

        app.get('/availableCars', async (req, res) => {  //------> Public
            const query = { availability: true }
            const result = await carBase.find(query).toArray()
            res.send(result)
        })

        app.get('/allCars', async (req, res) => {  //------> Public
            const result = await carBase.find().toArray()
            res.send(result)
        })

        app.get('/latestSix', async (req, res) => {  //------> Public
            const result = await carBase.find().sort({ submitDate: -1 }).limit(6).toArray()
            res.send(result)
        })

        app.get('/cars/search', async (req, res) => {  //------> Public
            const q = req.query.q;
            // console.log(q)
            const query = { location: { $regex: `\\b${q}`, $options: 'i' }, availability: true }
            const result = await carBase.find(query).toArray()
            res.send(result)
        })

        app.get('/myCars', verifyToken, async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            
            if(req.user.email !== email){
                return res.status(403).send({message: 'Forbidden Access'})
            }
            const result = await carBase.find(query).toArray()
            res.send(result)
        })

        app.get('/myBookings', verifyToken, async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            if(req.user.email !== email){
                return res.status(403).send({message: 'Forbidden Access'})
            }
            const result = await bookingBase.find(query).toArray()
            res.send(result)
        })

        app.get('/confirmed', verifyToken, async (req, res) => {
            const email = req.query.email;
            if(req.user.email !== email){
                return res.status(403).send({message: 'Forbidden Access'})
            }
            const query = { bookingStatus: "confirmed", email: email };
            const result = await bookingBase.find(query).toArray()
            res.send(result)
        })

        app.get('/car/:id', async (req, res) => {  //------> Public
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await carBase.find(query).toArray()
            res.send(result)
        })

        // POST APIS
        app.post('/addCar', verifyToken, async (req, res) => {
            const response = req.body;
            const result = await carBase.insertOne(response)
            res.send(result)
        })

        app.post('/booking', verifyToken, async (req, res) => {
            const response = req.body;
            const result = await bookingBase.insertOne(response)
            res.send(result)
        })


        // PATCH API

        app.patch('/updateBookingCount/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const options = { upsert: true }
            const updateCount = {
                $inc: { bookingCount: 1 }
            }
            const result = await carBase.updateOne(filter, updateCount, options)
            res.send(result)
        })

        app.patch('/updateBooking/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updateCount = {
                $inc: { bookingCount: -1 }
            }
            const result = await carBase.updateOne(filter, updateCount)
            res.send(result)
        })

        app.patch('/updateCar/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const car = req.body;
            const filter = { _id: new ObjectId(id) }
            const options = { upsert: true }
            const updatedCar = {
                $set: {
                    carModel: car?.carModel,
                    dailyRentalPrice: car?.dailyRentalPrice,
                    availability: car?.availability,
                    vehicleRegistrationNumber: car?.vehicleRegistrationNumber,
                    features: car?.features,
                    description: car?.description,
                    imageUrl: car?.imageUrl,
                    location: car?.location,
                }
            }
            const result = await carBase.updateOne(filter, updatedCar, options)
            res.send(result)
        })

        app.patch('/bookingStatus/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const car = req.body;
            const filter = { _id: new ObjectId(id) }
            const options = { upsert: true }
            const updatedCar = {
                $set: {
                    bookingStatus: "canceled",
                }
            }
            const result = await bookingBase.updateOne(filter, updatedCar, options)
            res.send(result)
        })

        app.patch('/modifyDate/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const car = req.body;
            const filter = { _id: new ObjectId(id) }
            const options = { upsert: true }
            const updatedCar = {
                $set: {
                    bookingDate: car?.bookingDateUpdated,
                }
            }
            const result = await bookingBase.updateOne(filter, updatedCar, options)
            res.send(result)
        })

        // DELETE API
        app.delete('/deleteCar/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await carBase.deleteOne(query);
            const booking = { carId: id }
            const deleteBooking = await bookingBase.deleteMany(booking)
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