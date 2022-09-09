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
	// 	connectionString:"postgres://emhkofcqvywsys:a8dd8f3cc858551e8bf86b5cceca98361f02972980bf0080a5650855b82fcdff@ec2-54-159-22-90.compute-1.amazonaws.com:5432/d6v6d92eqe67do",
	// 	ssl: {
	// 	  rejectUnauthorized: false,
	// 	}
	// 	});

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
const crearSesionDeIcs =  async (request, response)=>{
  let entrenador= request.body.entrenador;
  let cliente = request.body.cliente;
  let fecha = request.body.fecha;
  let asistio = request.body.asistio;
  try{
    if(entrenador && cliente && fecha){
      const clienteRes = await pool.query("SELECT cedula FROM clientes WHERE nombre LIKE $1",[cliente]);
      const entrenadorRes = await pool.query("SELECT cedula FROM entrenadores where nombre LIKE $1",[entrenador]);
      if(clienteRes.rowCount<1 || entrenadorRes.rowCount<1){
        response.status(400)
          .send({
            message: "Verifique el cliente o el entrenador ingresado"
          });
          return;
      }else{
        cliente = clienteRes.rows[0].cedula
        entrenador = entrenadorRes.rows[0].cedula
        const countRes = await pool.query("SELECT COUNT(*) FROM SESIONES WHERE (entrenador=$1 OR cliente=$2) AND TO_TIMESTAMP(fecha,'YYYY-MM-DD HH24:MI') BETWEEN TO_TIMESTAMP($3,'YYYY-MM-DD HH24:MI') AND TO_TIMESTAMP($4,'YYYY-MM-DD HH24:MI') + interval '74 minutes' ", [entrenador, cliente, fecha, fecha]);
        if(countRes.rows[0].count>0){
            response.status(400).send({
              message: "Ya hay sesiones agendadas en dicho horario"
          })
          return;
        }else{
          await pool.query("INSERT INTO SESIONES(entrenador,cliente,fecha,asistio) VALUES($1,$2,$3,$4)",[entrenador,cliente,fecha,asistio])
          response.status(200).send({message:"Sesion Agendada Exitosamente"});
          return;
        }
      }
      
    }
  }catch (e){
      response.status(400).send({
        message: e
    });
    return;
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


module.exports = {crearSesion,desagendarSesion, registrarAsistencia, getSesiones, crearSesionDeIcs}