const jwt = require("jsonwebtoken");

function authorizeUser(req, res, next) {
    if (req.headers.authorization != undefined) {
      jwt.verify(
        req.headers.authorization,
        process.env.JWT_KEY,
        (err, decode) => {
            if(err)
            {
                console.log("err", err.toString(), "---")
                if((err.toString()).includes("TokenExpiredError"))
                {
                    res.status(401).json({
                    message: "Token Expired, Please login Again.",
                    result: false
                    })
                    return
                }

                console.log(err)
                throw err;
            }

          if (decode) {
            console.log(decode);
            next();
          } else {
            res.status(401).json({result: false, message: "User not logged in"});
          }
        }
      );
    } else {
        res.status(401).json({result: false, message: "User not logged in"});
    }
  }


  function allowPermittedUser(role) {
    return function (req, res, next) {
      if (req.role && req.role == role) {
        next();
      } else {
        res.status(403).json({
          message: "FORBIDDEN",
          result: false
        });
      }
    };
  }
  
  module.exports = {authorizeUser, allowPermittedUser};