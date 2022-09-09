var jwt = require("jsonwebtoken");
var bcrypt = require("bcrypt");
const Pool = require("pg").Pool

const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
  ssl: {
    rejectUnauthorized: false,
  }
  });

// const pool = new Pool({
//     connectionString:"postgres://emhkofcqvywsys:a8dd8f3cc858551e8bf86b5cceca98361f02972980bf0080a5650855b82fcdff@ec2-54-159-22-90.compute-1.amazonaws.com:5432/d6v6d92eqe67do",
//     ssl: {
//       rejectUnauthorized: false,
//     }
//     });

const signup = (request, response) =>{
    let usuario = request.body.usuario;
    let email = request.body.email;
    let password = request.body.password;
    let rol = request.body.rol;
    if(usuario && email && password){
        pool.query("INSERT INTO usuarios(usuario,password,email,rol) VALUES($1,$2,$3,$4)", [usuario, bcrypt.hashSync(password, 8), email,rol], (error, results)=>{
            if (error) {
              console.log(error)
              response.status(500)
                  .send({
                    message: error
                  });
              }
            else {
              response.status(200).send({message:"Usuario Creado Exitosamente"});
            }
        });
    }else{
      response.status(202).json({message:"Campos Faltantes"});
    }
};

const getUsuarios = (request,response) =>{
  pool.query("SELECT usuario, email, rol FROM usuarios",(error,results)=>{
    if (error) {
      response.status(500)
          .send({
            message: error
          });
      }else{
        response.status(200).send({usuarios:results.rows});
      }
  })
}



const signin = (req,res)=>{
    let usuario = req.body.usuario;
    let email = req.body.email;
    let password = req.body.password;
    if(usuario && email && password){
        pool.query("SELECT * FROM usuarios WHERE usuario = $1 AND email = $2",[usuario,email], function (error, results, fields){
          if (error) {
                res.status(500)
                  .send({
                    message: error
                  });
                return;
              }if(results.rows.length > 0){
                var passwordIsValid = bcrypt.compareSync(
                  password,
                  results.rows[0].password
                );
                if(passwordIsValid){
                var token = jwt.sign({
                    usuario: results.rows[0].usuario,
                    rol: results.rows[0].rol
                }, process.env.API_SECRET,{
                    expiresIn: 86400
                });

                res.status(200).send({usuario:results.rows[0].usuario,             
                    rol: results.rows[0].rol,
                    message: "Login Successfull", 
                    accessToken: token}
                    );
                  }else{
                    res.status(400).send({ 
                      message: "Credenciales Incorrectas"
                      }
                      );
                  }
              }else{
                res.status(400).send({ 
                  message: "Credenciales Incorrectas"
                  }
                  );
              }
        });
    }else{
      res.status(400).send({ 
          message: "Credenciales Incorrectas"
        }
        );
    }
}

module.exports = {signup,signin,getUsuarios}