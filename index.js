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

// [authorizeUser, allowPermittedUser()],

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
            res.status(409).json({result: false, message: "Topic Already exists! Please create a new topic."});
            return;
        }
        data.createdOn = new Date();
        data.discussion = [];
        data.email = email;
        data.userName = userName;
        console.log(data);

        result = await db.collection("topics").insertOne(data);
        res.status(200).json({message: "Topic added successfully", result: true});
    } catch (err) {
        console.log(err);
        res.status(500).json({message: "Internal server error", result: false});
    }
});


app.post("/topics/:topicId", async (req, res) => {
    try {
        let client = await mongodb.connect(dbUrl);
        let db = client.db("ForumWebsiteDB");
        let data = req.body;
        let fromDate = req.query.fromDate;
        console.log("FromDate:", fromDate);
        const url = require('url');
        const querystring = require('querystring');

        let parsedQs = querystring.parse(req._parsedUrl.query);
        console.log("--",parsedQs);
        console.log(req.query)

        // let authHeader = req.headers.authorization;
        // let decodedHeader = jwt_decode(authHeader);
        // let email = decodedHeader.email;
        // let userName = decodedHeader.userName;
        // let email = "rcmadhankumar@gmail.com";
        // let userName = "Madhankumar Chellamuthu";
        // let topicId = ObjectId(req.params.topicId);

        
        // data.createdOn = new Date();
        // // data.email = email;
        // // data.userName = userName;
        // console.log(data);

        let filter = {};
        // if(req.query.fromDate)
        // {
        //     filter.discussion.createdOn = {
        //         $gte: new Date(req.query.fromDate)
        //     }
        // }
        
        // if(req.query.toDate)
        // {
        //     filter = {
        //         "discussion.createdOn":{  $eq: new Date(req.query.toDate)}
        //     }
                
        // }
        
        /*let result = db.collection("topics").aggregate({}).project({
            discussion:{
                $filter: {
                    input: "$discussion",
                    cond: {
                        $and:[
                            // {
                            //     $lte : ["$$this.createdOn", new Date(req.query.toDate)]
                            // },
                            // {
                            //     $gte : ["$$this.createdOn", new Date(req.query.fromDate)]
                            // }
                        ]
                    }
                }
            },
            
        })*/

        /*let result = db.collection("topics").find({
            name: {
                $regex: '^Py'
            }
        })
        */

        /*let result = db.collection("topics").updateOne({
            "discussion.userName": "Madhankumar Chellamuthu"
        },{
            $set: {
                "discussion.$.userName": "Maddy"
            }
        })*/

        /*let result = db.collection("topics").updateOne({},{
            $pull: {
                discussion: {
                    userName: "AhemedKoushik"
                }
            }
        })*/

        ///console.log(new Date(req.query.toDate))
        // console.log(filter)
        // let result = await db.collection("topics").find().project({
        //     discussion:1
        // }, {
        //     filter
        // })



        // {"discussion": 1}
        // , filter);
        //result.limit(2)
        // result = (await result.limit(2).toArray())
        console.log(result)
        //console.log(result[0].discussion)
        // console.log(result[0].discussion)
        
        

        //result = await db.collection("topics").findOneAndUpdate({
        //     _id: topicId
        // },
        // {
        //     $push: {
        //         discussion: data
        //     }
        // });
        res.status(200).json({message: "Topic added successfully", result: true});
    } catch (err) {
        console.log(err);
        res.status(500).json({message: "Internal server error", result: false});
    }
});
