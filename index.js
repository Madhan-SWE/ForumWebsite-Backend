const express = require("express");
const mongodb = require("mongodb");
const cors = require("cors");
const dotenv = require("dotenv");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const jwt_decode = require("jwt-decode");
const {
    authorizeUser,
    allowPermittedUser,
} = require("./customMiddleWares/authentication");

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
        let result = await db
            .collection("users")
            .findOne({ email: data.email });

        if (result) {
            res.status(409).json({
                result: false,
                message: "User Already exists!",
            });
            return;
        }
        console.log(data);
        data.password = await bcrypt.hash(data.password, salt);
        data.userType = "standardUser"
        console.log(data);

        result = await db.collection("users").insertOne(data);
        res.status(200).json({
            message: "User added successfully",
            result: true,
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({
            message: "Internal server error",
            result: false,
        });
    }
});


app.get("/checkLogin", [authorizeUser],  async (req, res) => {
    try {
        if(!req.headers.authorization)
        {
            res.status(404).json({
                message: "Token not found!",
                result: false
            })
        }
        
        let authHeader = req.headers.authorization;
        let decodedHeader = jwt_decode(authHeader);
        console.log("decoded header:", decodedHeader)
        let email = decodedHeader.email;

        let client = await mongodb.connect(dbUrl);
        let db = client.db("ForumWebsiteDB");
        let data = await db
            .collection("users")
            .findOne({ email: email });
        
            console.log("data", data)
        let resultData = {
            email: data.email,
            userName: data.userName,
            role: data.userType
        }
        res.status(200).json({
            result: true,
            message: "login successful",
            body: resultData
        });

        client.close(); 
    }catch (error) {
        console.log(error);
        res.status(500).json({
            message: "Internal Server error",
            result: false,
        });
    }
});


app.post("/login", async (req, res) => {
    try {
        let client = await mongodb.connect(dbUrl);
        let db = client.db("ForumWebsiteDB");
        let data = await db
            .collection("users")
            .findOne({ email: req.body.email });
        if (data) {
            let isValid = await bcrypt.compare(
                req.body.password,
                data.password
            );
            if (isValid) {
                let token = await jwt.sign(
                    {
                        userId: data._id,
                        email: data.email,
                        userName: data.userName
                    },
                    process.env.JWT_KEY,
                    { expiresIn: "1h" }
                );
                console.log("valid user", isValid);
                console.log("token", token);
                res.status(200).json({
                    result: true,
                    message: "login successful",
                    token
                });
            } else {
                res.status(403).json({
                    result: false,
                    message: "invalid password",
                });
            }
        } else {
            res.status(401).json({
                result: false,
                message: "Email ID is not registered",
            });
        }
        client.close();
    } catch (error) {
        console.log(error);
        res.status(500).json({
            message: "Internal Server error",
            result: false,
        });
    }
});



app.post("/topics", [authorizeUser, allowPermittedUser(['adminUser', 'standardUser'])], async (req, res) => {
    try {
        let client = await mongodb.connect(dbUrl);
        let db = client.db("ForumWebsiteDB");
        let data = req.body;
        let authHeader = req.headers.authorization;
        let decodedHeader = jwt_decode(authHeader);
        let email = decodedHeader.email;
        let userName = decodedHeader.userName;

        let result = await db
            .collection("topics")
            .findOne({ topic: req.body.topic });
        if (result) {
            res.status(409).json({
                result: false,
                message: "Topic Already exists! Please create a new topic.",
                status: 409,
            });
            return;
        }
        data.createdOn = new Date();
        data.discussion = [];
        // data.email = email;
        // data.userName = userName;
        console.log(data);

        result = await db.collection("topics").insertOne(data);
        res.status(200).json({
            message: "Topic added successfully",
            result: true,
            status: 200,
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({
            message: "Internal server error",
            result: false,
            status: 500,
        });
    }
});

/* route to add topic */
app.post("/topics/:topicId",  [authorizeUser, allowPermittedUser(['adminUser', 'standardUser'])], async (req, res) => {
    try {
        let client = await mongodb.connect(dbUrl);
        let db = client.db("ForumWebsiteDB");
        let topicId = ObjectId(req.params.topicId);
        let authHeader = req.headers.authorization;
        let decodedHeader = jwt_decode(authHeader);
        let email = decodedHeader.email;
        let userName = decodedHeader.userName;

        //check if topic exists
        let result = await db.collection("topics").findOne({ _id: topicId });

        if (!result) {
            res.status(404).json({
                message: "Topic not found",
                result: false,
                status: 404,
            });
            return;
        }

        let reply = req.body.reply;

        let data = [
            {
                createdOn: new Date(),
                reply,
                email,
                userName,
            },
        ];

        // Add reply to discussion
        result = await db.collection("topics").findOneAndUpdate(
            {
                _id: topicId,
            },
            {
                $push: {
                    discussion: {
                        $each: data,
                        $sort: {
                            createdOn: -1,
                        },
                    },
                },
            }
        );

        res.status(200).json({
            message: "Reply added",
            result: true,
            status: 200,
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({
            message: "Internal server error",
            result: false,
            status: 500,
        });
    }
});

/* route to get all topics */
app.get("/topics", async (req, res) => {
    try {
        let client = await mongodb.connect(dbUrl);
        let db = client.db("ForumWebsiteDB");
        //get content
        let search = "";
        if(req.query.search) search = req.query.search;
        console.log(req.query)

        let result = await db.collection("topics").find({
            // topic: ""
            topic: {
                $regex: search
            }
        })
        .project({
            _id: 1,
            topic: 1
        });

        

        result = await result.toArray();
        console.log(result);
        // return content
        res.status(200).json({
            body: result,
            result: true,
            status: 200,
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({
            message: "Internal server error",
            result: false,
            status: 500,
        });
    }
});

/* route to get content by topicId */
app.get("/topics/:topicId", async (req, res) => {
    try {
        let client = await mongodb.connect(dbUrl);
        let db = client.db("ForumWebsiteDB");
        let topicId = ObjectId(req.params.topicId);

        //get content
        let result = await db.collection("topics").findOne({ _id: topicId });
        if (!result) {
            // return 404 if topic doesn't exist
            res.status(404).json({
                message: "Topic not found",
                result: false,
                status: 404,
            });
            return;
        }

        // console.log(result);

        let fromDate = null;
        let toDate = null;
        let condition = [];

        if (req.query.fromDate) fromDate = req.query.fromDate;
        if (fromDate) {
            let query = {
                $gte: ["$$this.createdOn", new Date(fromDate)],
            };
            condition.push(query);
        }
        console.log(req.query);
        if (req.query.toDate) toDate = req.query.toDate;
        if (toDate) {
            let query = {
                $lte: ["$$this.createdOn", new Date(toDate)],
            };
            condition.push(query);
        }

        console.log(condition);
        // console.log(result);

        result = await db
            .collection("topics")
            .aggregate([
                {
                    $match: {
                        _id: topicId,
                    },
                },
            ])
            .project({
                topic: 1,
                discussion: {
                    $filter: {
                        input: "$discussion",
                        cond: {
                            $and: condition,
                        },
                    },
                },
            })
            .sort({
                "discussion.createdOn": 1,
            });

        result = await result.toArray();
        console.log(topicId);
        console.log(result);
        // return content
        res.status(200).json({
            body: result[0],
            result: true,
            status: 200,
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({
            message: "Internal server error",
            result: false,
            status: 500,
        });
    }
});

/* route to delete content of a topic */
app.delete("/topics/:topicId",  [authorizeUser, allowPermittedUser(['adminUser'],)], async (req, res) => {
    try {
        let client = await mongodb.connect(dbUrl);
        let db = client.db("ForumWebsiteDB");
        let topicId = ObjectId(req.params.topicId);

        //get content
        let result = await db.collection("topics").findOne({ _id: topicId });
        if (!result) {
            // return 404 if topic doesn't exist
            res.status(404).json({
                message: "Topic not found",
                result: false,
                status: 404,
            });
            return;
        }

        let idx = req.body.idx;
        let unsetText = "discussion." + idx;
        console.log(idx, "Delete")

        result = await db.collection("topics").updateOne({
                _id: topicId
            
        },{
            $unset: {
                [unsetText]: 1
            }
        })

        console.log(result)

        result = await db.collection("topics").updateOne({
            _id: topicId
        },{
            $pull: {
                "discussion": null
            }
        })
        
        res.status(200).json({
            message: "Delete Successful!",
            result: true,
            status: 200,
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({
            message: "Internal server error",
            result: false,
            status: 500,
        });
    }
});


/* route to delete content of a topic */
app.put("/topics/:topicId",  [authorizeUser, allowPermittedUser(['adminUser', 'standardUser'])], async (req, res) => {
    try {
        let client = await mongodb.connect(dbUrl);
        let db = client.db("ForumWebsiteDB");
        let topicId = ObjectId(req.params.topicId);

        //get content
        let result = await db.collection("topics").findOne({ _id: topicId });
        if (!result) {
            // return 404 if topic doesn't exist
            res.status(404).json({
                message: "Topic not found",
                result: false,
                status: 404,
            });
            return;
        }

        let idx = req.body.idx;
        let reply = req.body.reply;
        console.log(reply);

        let setText = "discussion." + idx + ".reply";
        console.log(idx, "Update");
        


        result = await db.collection("topics").updateOne({
                _id: topicId
            
        },{
            $set: {
                [setText]: reply
            }
        })

        
        res.status(200).json({
            message: "Delete Successful!",
            result: true,
            status: 200,
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({
            message: "Internal server error",
            result: false,
            status: 500,
        });
    }
});
