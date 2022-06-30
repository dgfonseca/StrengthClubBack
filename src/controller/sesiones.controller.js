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

const desagendarSesion = (request, response)=>{
    let id = request.body.id;
    if(id){
        pool.query("DELETE FROM SESIONES WHERE id=$1 AND asistio=false", [id], (error, results)=>{
            if (error) {
              response.status(500)
                  .send({
                    message: error
                  });
                  return;
              }else if(results.rowCount<=0){
                response.status(400).json({message:"No existe sesión en ese horario con ese entrenador y cliente para desagendar"});
                return;
              }
            else {
                response.status(200).json({message:"Sesion desagendada"});
                return;
            }
        });
    }else{
      response.status(400).json({message:"Campos Faltantes"});
    }

}

const registrarAsistencia = (request, response)=>{
    let entrenador = request.body.entrenador;
    let cliente = request.body.cliente;
    let fecha = request.body.fecha;
    let asistio = request.body.asistio;
    if(entrenador && cliente && fecha){
        pool.query("UPDATE SESIONES SET asistio = $1 WHERE (entrenador=$2 OR cliente=$3) AND TO_TIMESTAMP(fecha,'YYYY-MM-DD HH24:MI') BETWEEN TO_TIMESTAMP($4,'YYYY-MM-DD HH24:MI') AND TO_TIMESTAMP($5,'YYYY-MM-DD HH24:MI') + interval '74 minutes' ", [asistio,entrenador, cliente, fecha,fecha], (error, results)=>{
            if (error) {
              response.status(500)
                  .send({
                    message: error
                  });
                  return;
              }else if(results.rowCount<=0){
                response.status(200).json({message:"No existe sesión en ese horario con ese entrenador y cliente para actualizar"});
                return;
              }
            else {
                response.status(200).json({message:"Asistencia actualizada"});
                return;
            }
        });
    }else{
      response.status(400).json({message:"Campos Faltantes"});
    }

}

const crearSesion = (request, response) =>{
    let entrenador = request.body.entrenador;
    let cliente = request.body.cliente;
    let fecha = request.body.fecha;
    let asistio = request.body.asistio;
    if(entrenador && cliente && fecha){
        pool.query("SELECT COUNT(*) FROM SESIONES WHERE (entrenador=$1 OR cliente=$2) AND TO_TIMESTAMP(fecha,'YYYY-MM-DD HH24:MI') BETWEEN TO_TIMESTAMP($3,'YYYY-MM-DD HH24:MI') AND TO_TIMESTAMP($4,'YYYY-MM-DD HH24:MI') + interval '74 minutes' ", [entrenador, cliente, fecha,fecha], (error, results)=>{
            if (error) {
              console.log(error)
              response.status(500)
                  .send({
                    message: error
                  });
                  return;
              }
              else if(results.rows[0].count>0){
                response.status(400).send({
                    message: "Ya hay sesiones agendadas en dicho horario"
                })
                return;
              }
            else {
                pool.query("INSERT INTO SESIONES(entrenador,cliente,fecha,asistio) VALUES($1,$2,$3,$4)",[entrenador,cliente,fecha,asistio],(error)=>{
                    if(error){
                                response.status(500)
                        .send({
                            message: error
                        });
                        return;
                    }else{
                        response.status(200).send({message:"Sesion Agendada Exitosamente"});
                        return;
                    }
                })
                return;
            }
        });
    }else{
      response.status(400).json({message:"Campos Faltantes"});
    }
};

const getSesiones = (request,response) =>{
  pool.query("SELECT ses.asistio,ses.id,ses.entrenador,ses.cliente,ses.fecha,ent.color as color, ent.nombre as nombreEntrenador,cli.nombre as nombreCliente, TO_CHAR(TO_TIMESTAMP(ses.fecha,'YYYY-MM-DD HH24:MI') + interval '75 minutes','YYYY-MM-DD HH24:MI') as fechaFin FROM sesiones as ses INNER JOIN entrenadores AS ent ON ses.entrenador=ent.cedula INNER JOIN clientes AS cli on ses.cliente=cli.cedula  ",(error,results)=>{
    if (error) {
      response.status(500)
          .send({
            message: error
          });
      }else{
        response.status(200).send({sesiones:results.rows});
      }
  })
}


module.exports = {crearSesion,desagendarSesion, registrarAsistencia, getSesiones}