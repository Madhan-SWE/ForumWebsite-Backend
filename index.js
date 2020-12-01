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

app.post("/topic", [authorizeUser, allowPermittedUser()], async (req, res) => {
    try {
        let client = await mongodb.connect(dbUrl);
        let db = client.db("ForumWebsiteDB");
        let data = req.body;
        let authHeader = req.headers.authorization;
        let decodedHeader = jwt_decode(authHeader);
        let email = decodedHeader.email;
        let result = await db.collection("topics").findOne({topic: req.body.topic});
        if (result) {
            res.status(409).json({result: false, message: "Topic Already exists! Please create a new topic."});
            return;
        }
        data.dateTime = new Date();
        data.comments = [];
        data.email = email;
        console.log(data);

        result = await db.collection("topics").insertOne(data);
        res.status(200).json({message: "Topic added successfully", result: true});
    } catch (err) {
        console.log(err);
        res.status(500).json({message: "Internal server error", result: false});
    }
});
