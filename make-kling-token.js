const jwt = require("jsonwebtoken");

const ak = "APA9Mh9ATPaFBeGRJd8343CfmMprRg4r";
const sk = "KytHaM9gLmnDH8fFYyJ9P4hmB3AkYDar";

const now = Math.floor(Date.now() / 1000);

const token = jwt.sign(
  {
    iss: ak,
    exp: now + 1800,
    nbf: now - 5,
  },
  sk,
  { algorithm: "HS256" }
);

console.log(token);