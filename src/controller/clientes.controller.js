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


const getClientes = (request,response) =>{
  pool.query("SELECT * FROM clientes",(error,results)=>{
    if (error) {
      response.status(500)
          .send({
            message: error
          });
      }else{
        response.status(200).send({clientes:results.rows});
      }
  })
}
const crearCliente = (request, response) =>{
    let nombre = request.body.nombre;
    let email = request.body.email;
    let direccion = request.body.direccion;
    let telefono = request.body.telefono;
    let cedula = request.body.cedula;
    let nacimiento = request.body.fechaNacimiento;
    if(nombre && email && direccion && telefono && cedula && nacimiento){
        pool.query("INSERT INTO clientes(cedula,nombre,email,telefono,direccion,fecha_nacimiento) VALUES($1,$2,$3,$4,$5,$6)", [cedula, nombre, email,telefono,direccion,nacimiento], (error, results)=>{
            if (error) {
              response.status(500)
                  .send({
                    message: error
                  });
              }
            else {
              response.status(200).send({message:"Cliente Creado Exitosamente"});
            }
        });
    }else{
      response.status(400).json({message:"Campos Faltantes"});
    }
};



module.exports = {crearCliente,getClientes}