var jwt = require("jsonwebtoken");
var bcrypt = require("bcrypt");
const Pool = require("pg").Pool

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'strength_club',
  password: 'santafe',
  port: 5432,
});

const signup = (request, response) =>{
    let usuario = request.body.usuario;
    let email = request.body.email;
    let password = request.body.password;
    let rol = request.body.rol;
    if(usuario && email && password){
        pool.query("INSERT INTO usuarios(usuario,password,email,rol) VALUES($1,$2,$3,$4)", [usuario, bcrypt.hashSync(password, 8), email,rol], (error, results)=>{
            if (error) {
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
                    id: results.rows[0].id
                }, process.env.API_SECRET,{
                    expiresIn: 3600
                });

                res.status(200).send({usuario:{usuario:results.rows[0].rol}, 
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

module.exports = {signup,signin}