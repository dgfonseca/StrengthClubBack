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
//   connectionString:"postgres://emhkofcqvywsys:a8dd8f3cc858551e8bf86b5cceca98361f02972980bf0080a5650855b82fcdff@ec2-54-159-22-90.compute-1.amazonaws.com:5432/d6v6d92eqe67do",
//   ssl: {
//     rejectUnauthorized: false,
//   }
//   });

const getEntrenadores = (request,response) =>{
  pool.query("SELECT * FROM entrenadores",(error,results)=>{
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

const updateEntrenador = (request, response) =>{
  let nombre = request.body.nombre;
  let email = request.body.email;
  let direccion = request.body.direccion;
  let telefono = request.body.telefono;
  let cedula = request.body.cedula;
  let color = request.body.color
if(nombre && email && direccion && telefono && cedula && color){
    pool.query("UPDATE entrenadores SET nombre=$1,email=$2,direccion=$3,telefono=$4,color=$5 WHERE cedula=$6", [nombre, email,direccion,telefono,color,cedula], (error, results)=>{
        if (error) {
          response.status(500)
              .send({
                message: error
              });
          }
        else {
          response.status(200).send({message:"Entrenador Actualizado Exitosamente"});
        }
    });
}else{
  response.status(400).json({message:"Campos Faltantes"});
}
};

const deleteEntrenadores = (request,response) =>{
  let cedula = request.body.cedula;
  if(cedula){
    pool.query("DELETE FROM entrenadores WHERE cedula=$1",[cedula],(error,results)=>{
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



module.exports = {crearEntrenador,getEntrenadores,deleteEntrenadores,updateEntrenador}