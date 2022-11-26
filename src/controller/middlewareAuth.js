const Pool = require("pg").Pool
var jwt = require("jsonwebtoken");


const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
  ssl: false

  });

// const pool = new Pool({
//   connectionString:"postgres://emhkofcqvywsys:a8dd8f3cc858551e8bf86b5cceca98361f02972980bf0080a5650855b82fcdff@ec2-54-159-22-90.compute-1.amazonaws.com:5432/d6v6d92eqe67do",
//   ssl: {
//     rejectUnauthorized: false,
//   }
//   });

function validateToken(req, res, next) {
  const authHeader = req.headers["x-access-token"];
  if (authHeader == null) return res.sendStatus(401);
  jwt.verify(authHeader, process.env.API_SECRET, (err, decoded) => {
    if (err) return res.sendStatus(401);
    req.tokenData = decoded.usuario;
    next();
  });
}

function isAdmin(req,res,next){
  let usuario = req.tokenData
  pool.query("SELECT rol FROM usuarios WHERE usuario=$1",[usuario],(error,results)=>{
    if(error){
      res.status(500).send({message:error})
    }
    if(results.rows[0].rol==="ADMIN"){
      next();
      return;
    }
    res.status(403).send({
      message: "Require Admin Role!"
    });
    return;
  })
}

function isCajero(req,res,next){
  let usuario = req.tokenData
  pool.query("SELECT rol FROM usuarios WHERE usuario=$1",[usuario],(error,results)=>{
    if(error){
      res.status(500).send({message:error})
    }
    if(results.rows[0].rol==="CAJERO" || results.rows[0].rol==="ADMIN"){
      next();
      return;
    }
    res.status(403).send({
      message: "Require Cajero Role!"
    });
    return;
  })
}





module.exports = {validateToken,isAdmin,isCajero}