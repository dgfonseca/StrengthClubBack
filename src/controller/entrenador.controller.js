var jwt = require("jsonwebtoken");
var bcrypt = require("bcrypt");
const Pool = require("pg").Pool

const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
  });

const getEntrenadores = (request,response) =>{
  pool.query("SELECT nombre,cedula FROM entrenadores",(error,results)=>{
    if (error) {
      response.status(500)
          .send({
            message: error
          });
      }else{
        response.status(200).send({entrenadores:results.rows});
      }
  })
}

const crearEntrenador = (request, response) =>{
    let nombre = request.body.nombre;
    let email = request.body.email;
    let direccion = request.body.direccion;
    let telefono = request.body.telefono;
    let cedula = request.body.cedula;
    let color = request.body.color
    if(nombre && email && direccion && telefono && cedula){
        pool.query("INSERT INTO entrenadores(cedula,nombre,email,telefono,direccion,color) VALUES($1,$2,$3,$4,$5,$6)", [cedula, nombre, email,telefono,direccion,color], (error, results)=>{
            if (error) {
              response.status(500)
                  .send({
                    message: error
                  });
              }
            else {
              response.status(200).send({message:"Entrenador Creado Exitosamente"});
            }
        });
    }else{
      response.status(400).json({message:"Campos Faltantes"});
    }
};



module.exports = {crearEntrenador,getEntrenadores}