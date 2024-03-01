const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 5000;

const category = require('./category.json');
// console.log(category);

// Middleware
app.use(
  cors({
    origin: [
      "https://ashik-feed-forward-foundation.netlify.app",
    //   "http://localhost:5173",
    ],
    credentials: true,
  })
);
app.use(express.json());

// MongoDB Connection URL
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function run() {
    try {
        // Connect to MongoDB
        // await client.connect();
        console.log("Connected to MongoDB");

        const usersCollection = client.db('food_donation').collection('users');
        const suppliesCollection = client.db('food_donation').collection('supply');
        const postsCollection = client.db('food_donation').collection('posts');
        const volunteerCollection = client.db("food_donation").collection("volunteer");
        const reviewCollection = client.db("food_donation").collection("review");

        // User Registration
        app.post('/api/v1/register', async (req, res) => {
            const { name, email, password } = req.body;
            // console.log({email,name});

            // Check if email already exists
            const existingUser = await usersCollection.findOne({ email });
            if (existingUser) {
                return res.status(201).json({
                    success: false,
                    message: 'User already exists'
                });
            }

            // Hash the password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insert user into the database
            await usersCollection.insertOne({ name, email, password: hashedPassword });

            const token = jwt.sign(
              { email: email },
              process.env.JWT_SECRET,
              { expiresIn: process.env.EXPIRES_IN }
            );
            res.status(201).json({
                success: true,
                message: 'User registered successfully',
                token
            });
        });

        // User Login
        app.post('/api/v1/login', async (req, res) => {
            const { email, password } = req.body;

            // Find user by email
            const user = await usersCollection.findOne({ email });
            if (!user) {
                return res.status(401).json({ message: 'Invalid email or password' });
            }

            // Compare hashed password
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                return res.status(401).json({ message: 'Invalid email or password' });
            }

            // Generate JWT token
            const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, { expiresIn: process.env.EXPIRES_IN });

            res.json({
                success: true,
                message: 'Login successful',
                token
            });
        });


        // ==============================================================
        // WRITE YOUR CODE HERE
        // ==============================================================

        // supply

        app.post('/api/v1/create-supply', async (req, res) => {
            const supplyInfo = req.body;
            const result = await suppliesCollection.insertOne(supplyInfo);
            if (result.insertedId) {
                res.json({
                    success: true,
                    message: 'Donation added Successfully'
                })
            }
        })

        app.get("/api/v1/all-donation", async (req, res) => {
            const result = await suppliesCollection.find().toArray();
            if (result.length>0) {
                res.json({
                success: true,
                data:result,
                message: "Donations are retrieve Successfully",
                });
            }
        });

        app.delete('/api/v1/delete-donation/:id', async (req, res) => {
            const id = req.params.id;
            const result = await suppliesCollection.deleteOne({ _id: new ObjectId(id) });
            if (result.deletedCount > 0) {
                res.json({
                  success: true,
                  message: "Donation is deleted Successfully",
                });
            }
        })

        app.get('/api/v1/donation/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await suppliesCollection.findOne(query);
            if (result) {
              res.json({
                success: true,
                data: result,
                message: "Donation is retrieve Successfully",
              });
            }
        })

        app.put("/api/v1/update-donation/:id", async (req, res) => {
            const id = req.params.id;
            const updateInfo = req.body;
            const query = { _id : new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    title: updateInfo.title,
                    category: updateInfo.category,
                    description: updateInfo.description,
                    quantity: updateInfo.quantity
                }
            };
            const result = await suppliesCollection.updateOne(query, updatedDoc);
            if (result.modifiedCount > 0) {
                res.json({
                  success: true,
                  message: "Donation is updated Successfully",
                });
            }
        });

        app.get("/api/v1/getAllSupply/:email", async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const result = await usersCollection.findOne(query);
            if (result._id) {
                res.json({
                  success: true,
                  data:result,
                  message: "Donor Information is retrieve Successfully",
                });
            }
        });

        app.get('/api/v1/categoryCount', async (req, res) => {
            const allSupply = await suppliesCollection.find().toArray();
            let ans = [];
            for (let i = 0; i < category.length; i++){
                let categoryName = category[i].category;
                let count = 0;
                for (let j = 0; j < allSupply.length; j++){
                    if (allSupply[j].category == categoryName) {
                        count++;
                    }
                }
                ans.push({
                    name: categoryName,
                    value: count
                })
            }
            res.send(ans);
        })

        //leader board

        app.get("/api/v1/leaderboard", async (req, res) => {
            const allSupply = await suppliesCollection
              .find()
              .sort({ quantity: -1 })
              .toArray();
            let result = [];
            for (let i = 0; i < allSupply.length; i++){
                let supplierMail = allSupply[i].email;
                let query = { email: supplierMail };
                let supplierInfo = await usersCollection.findOne(query);
                result.push({
                    ...allSupply[i],
                    ...supplierInfo
                })
            }
            if (result.length > 0) {
              res.json({
                success: true,
                data: result,
                message: "Donations are retrieve Successfully",
              });
            }
        });

        // gratitude wall

        app.post("/api/v1/community", async (req, res) => {
            const postInfo = req.body;
            const result = await postsCollection.insertOne(postInfo);
            if (result.insertedId) {
                res.json({
                    success: true,
                });
            }
        });

        app.get("/api/v1/community", async (req, res) => {
            const allPosts = await postsCollection.find().toArray();
            let result = [];
            for (let i = 0; i < allPosts.length; i++) {
              let userMail = allPosts[i].email;
              let query = { email: userMail };
              let userInfo = await usersCollection.findOne(query);
              result.push({
                ...allPosts[i],
                ...userInfo,
              });
            }
            result.reverse();
            if (result.length > 0) {
                res.json({
                success: true,
                data: result,
                });
            }
        });

        // volunteer

        app.post("/api/v1/volunteer", async (req, res) => {
          const volunteerInfo = req.body;
          const result = await volunteerCollection.insertOne(volunteerInfo);
          if (result.insertedId) {
            res.json({
                success: true,
            });
          }
        });

        app.get("/api/v1/volunteer", async (req, res) => {
            const result = await volunteerCollection.find().toArray();
            if (result.length>0) {
                res.json({
                success: true,
                data:result,
                });
            }
        });

        // review

        app.post("/api/v1/dashboard/create-testimonial", async (req, res) => {
            const reviewInfo = req.body;
            const result = await reviewCollection.insertOne(reviewInfo);
            if (result.insertedId) {
              res.json({
                success: true,
              });
            }
        });

        // Start the server
        app.listen(port, () => {
            console.log(`Server is running on http://localhost:${port}`);
        });

    } finally {
    }
}

run().catch(console.dir);

// Test route
app.get('/', (req, res) => {
    const serverStatus = {
        message: 'Server is running smoothly',
        timestamp: new Date()
    };
    res.json(serverStatus);
});