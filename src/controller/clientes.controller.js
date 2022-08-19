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
  let query = "SELECT *, TO_CHAR(age(current_date, TO_DATE(fecha_nacimiento,'yyyy-mm-dd')), 'YY') as edad FROM clientes"
  pool.query(query,(error,results)=>{
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

const getContabilidadClientes = (request,response) =>{
  let query = "select c.cedula, c.nombre, c.email, sum(v.valor) as debito, sum(a.valor) as abonos from clientes c \
  left join ventas v on v.cliente = c.cedula \
  left join abonos a on a.cliente=c.cedula group by c.cedula, c.nombre,c.email"
  pool.query(query,(error,results)=>{
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

const updateCliente = (request, response) =>{
    let nombre = request.body.nombre;
    let email = request.body.email;
    let direccion = request.body.direccion;
    let telefono = request.body.telefono;
    let cedula = request.body.cedula;
    let nacimiento = request.body.fechaNacimiento;
  if(nombre && email && direccion && telefono && cedula && nacimiento){
      pool.query("UPDATE clientes SET nombre=$1,email=$2,direccion=$3,telefono=$4,fecha_nacimiento=$5 WHERE cedula=$6", [nombre, email,direccion,telefono,nacimiento,cedula], (error, results)=>{
          if (error) {
            response.status(500)
                .send({
                  message: error
                });
            }
          else {
            response.status(200).send({message:"Cliente Actualizado Exitosamente"});
          }
      });
  }else{
    response.status(400).json({message:"Campos Faltantes"});
  }
};

const deleteClientes = (request,response) =>{
  let cedula = request.body.cedula;
  if(cedula){
    pool.query("DELETE FROM clientes WHERE cedula=$1",[cedula],(error,results)=>{
      if (error) {
        response.status(500)
            .send({
              message: error
            });
        }else{
          response.status(200).send({message:"Eliminado exitosamente"});
        }
    })
  }else{
    response.status(400).json({message:"Campos Faltantes"});
  }
}



module.exports = {crearCliente,getClientes,deleteClientes,updateCliente, getContabilidadClientes}