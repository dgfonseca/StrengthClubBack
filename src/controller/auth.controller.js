var jwt = require("jsonwebtoken");
var bcrypt = require("bcrypt");
const Pool = require("pg").Pool

const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
  ssl: false
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
const actualizarUsuario = (request, response) =>{
    let usuario = request.body.usuario;
    let email = request.body.email;
    let password = request.body.password;
    if(usuario && email && password){
        pool.query("UPDATE usuarios SET email=$1, password=$2 where usuario=$3", [email, bcrypt.hashSync(password, 8), usuario], (error, results)=>{
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

const getOperacionesUsuarios = (request,response) =>{
  let usuario = request.tokenData;
  pool.query("select * from \
  (select c.nombre, v.fecha, cast(round(v.valor,0) as money) as valor, v.usuario, 'VENTA' as tipo from clientes c \
  inner join ventas v on v.cliente = c.cedula  where v.usuario=$1 and \
  (DATE_PART('week',TO_TIMESTAMP(v.fecha,'YYYY-MM-DD HH24:MI'))=DATE_PART('week',current_timestamp)) and \
  (DATE_PART('year',TO_TIMESTAMP(v.fecha,'YYYY-MM-DD HH24:MI'))=DATE_PART('year',current_timestamp)) \
  ) as q2 union( \
  select c.nombre, a.fecha, cast(round(a.valor,0) as money) as valor, a.usuario, 'ABONO' as tipo from clientes c \
  inner join abonos a on a.cliente = c.cedula  where a.usuario=$1 and \
  (DATE_PART('week',TO_TIMESTAMP(a.fecha,'YYYY-MM-DD HH24:MI'))=DATE_PART('week',current_timestamp)) and \
  (DATE_PART('year',TO_TIMESTAMP(a.fecha,'YYYY-MM-DD HH24:MI'))=DATE_PART('year',current_timestamp)))",[usuario],(error,results)=>{
    if (error) {
      response.status(500)
          .send({
            message: error
          });
      }else{
        response.status(200).send({operaciones:results.rows});
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
            console.log(error)
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

module.exports = {signup,signin,getUsuarios,getOperacionesUsuarios,actualizarUsuario}