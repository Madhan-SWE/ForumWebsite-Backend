const express = require("express");
const mongodb = require("mongodb");
const cors = require("cors");
const dotenv = require("dotenv");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const jwt_decode = require("jwt-decode");
const { authorizeUser, allowPermittedUser } = require("./customMiddleWares/authentication");


dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

const ObjectId = mongodb.ObjectID;
const port = process.env.PORT;
const dbUrl = process.env.DBURL;
const frontEnd = process.env.FRONTEND;


app.listen(port, () => console.log("App is running in port: ", port));

app.post("/register", async (req, res) => {
    try {
        let client = await mongodb.connect(dbUrl);
        let db = client.db("ForumWebsiteDB");
        let data = req.body;
        let salt = await bcrypt.genSalt(8);
        let result = await db.collection("users").findOne({email: data.email});

        if (result) {
            res.status(409).json({result: false, message: "User Already exists!"});
            return;
        }
        console.log(data)
        data.password = await bcrypt.hash(data.password, salt);
        console.log(data);

        result = await db.collection("users").insertOne(data);
        res.status(200).json({message: "User added successfully", result: true});
    } catch (err) {
        console.log(err);
        res.status(500).json({message: "Internal server error", result: false});
    }
});


app.post("/login", async (req, res) => {
    try {
        let client = await mongodb.connect(dbUrl);
        let db = client.db("ForumWebsiteDB");
        let data = await db.collection("users").findOne({email: req.body.email});
        if (data) {
            let isValid = await bcrypt.compare(req.body.password, data.password);
            if (isValid) {
                let token = await jwt.sign({
                    userId: data._id,
                    email: data.email
                }, process.env.JWT_KEY, {expiresIn: "1h"});
                console.log("valid user", isValid);
                console.log("token", token);
                res.status(200).json({result: true, message: "login successful", token});
            } else {
                res.status(403).json({result: false, message: "invalid password"});
            }
        } else {
            res.status(401).json({result: false, message: "Email ID is not registered"});
        } client.close();
    } catch (error) {
        console.log(error);
        res.status(500).json({message: "Internal Server error", result: false});
    }
});


app.post("/topics", async (req, res) => {
    try {
        let client = await mongodb.connect(dbUrl);
        let db = client.db("ForumWebsiteDB");
        let data = req.body;
        // let authHeader = req.headers.authorization;
        // let decodedHeader = jwt_decode(authHeader);
        // let email = decodedHeader.email;
        // let userName = decodedHeader.userName;
        let email = "rcmadhankumar@gmail.com";
        let userName = "Madhankumar Chellamuthu";

        let result = await db.collection("topics").findOne({topic: req.body.topic});
        if (result) {
            res.status(409).json({
                result: false, 
                message: "Topic Already exists! Please create a new topic.",
                status: 409
            });
            return;
        }
        data.createdOn = new Date();
        data.discussion = [];
        data.email = email;
        data.userName = userName;
        console.log(data);

        result = await db.collection("topics").insertOne(data);
        res.status(200).json({
            message: "Topic added successfully", 
            result: true,
            status: 200
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({
            message: "Internal server error", 
            result: false,
            status: 500
        });
    }
});

/* route to add topic */
app.post("/topics/:topicId", async (req, res) => {
    try {
        let client = await mongodb.connect(dbUrl);
        let db = client.db("ForumWebsiteDB");
        let topicId = ObjectId(req.params.topicId)

        
        let email = "rcmadhankumar@gmail.com";
        let userName = "Madhankumar Chellamuthu";
        
        //check if topic exists
        let result = await db.collection("topics").findOne({_id: topicId});
        if(! result)
        {
            res.status(404).json({
                message: "Topic not found",
                result: false,
                status: 404
            })
            return
        }

        let reply = req.body.reply;

        let data = {
            createdOn : new Date(),
            reply,
            email,
            userName
        }
        

        // Add reply to discussion
        result = await db.collection("topics").findOneAndUpdate({
            _id: topicId
        },
        {
            $push: {
                discussion: data
            }
        });

        res.status(200).json({
            message: "Reply added", 
            result: true,
            status: 200
        });

    } catch (err) {
        console.log(err);
        res.status(500).json({
            message: "Internal server error", 
            result: false,
            status: 500
        });
    }
});

/* route to get content by topicId */
app.get("/topics/:topicId", async (req, res) => {
    try {
        let client = await mongodb.connect(dbUrl);
        let db = client.db("ForumWebsiteDB");
        let topicId = ObjectId(req.params.topicId)
        
        //get content
        let result = await db.collection("topics").findOne({_id: topicId});
        if(! result)
        {
            // return 404 if topic doesn't exist
            res.status(404).json({
                message: "Topic not found",
                result: false,
                status: 404
            })
            return
        }

        console.log(result);

        // return content
        res.status(200).json({
            body: result, 
            result: true,
            status: 200
        });
        
    } catch (err) {
        console.log(err);
        res.status(500).json({
            message: "Internal server error", 
            result: false,
            status: 500
        });
    }
});
