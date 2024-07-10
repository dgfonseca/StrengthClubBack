const Pool = require("pg").Pool

const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
  ssl: false

  });


const desagendarSesion = (request, response)=>{
    let id = request.body.id;
    if(id){
        pool.query("DELETE FROM SESIONES WHERE id=$1", [id], (error, results)=>{
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
    let virtual = request.body.virtual;
    if(entrenador && cliente && fecha){
        pool.query("UPDATE SESIONES SET asistio = $1, virtual=$6 WHERE (entrenador=$2 OR cliente=$3) AND TO_TIMESTAMP(fecha,'YYYY-MM-DD HH24:MI') BETWEEN TO_TIMESTAMP($4,'YYYY-MM-DD HH24:MI') AND TO_TIMESTAMP($5,'YYYY-MM-DD HH24:MI') + interval '74 minutes' ", [asistio,entrenador, cliente, fecha,fecha,virtual], (error, results)=>{
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
const borrarSesionesEntrenador = async (request,response)=>{
  let entrenador = "%"+request.body.entrenador+"%";
  let fechaInicio = request.body.fechaInicio;
  let fechaFin = request.body.fechaFin;
  if(fechaInicio&&fechaFin){
    try{
      const entrenadorRes = await pool.query("SELECT cedula FROM entrenadores where nombre LIKE $1",[entrenador]);
      await pool.query("delete from sesiones where entrenador=$1 and TO_TIMESTAMP(fecha,'YYYY-MM-DD HH24:MI') BETWEEN TO_TIMESTAMP($2,'YYYY-MM-DD') AND TO_TIMESTAMP($3,'YYYY-MM-DD')",[entrenadorRes.rows[0].cedula,fechaInicio,fechaFin]);
      response.status(200)
      .send({
        message: "Se borraron las sesiones del entrenador "+entrenador.replaceAll("%",'')+" entre el "+fechaInicio +" y el "+fechaFin,
      });
      return;
    }catch(exception){
      console.log(exception)
      response.status(500)
      .send({
      message: "No se pudieron borrar las sesiones del entrenador "+entrenador.replaceAll("%",''),
      });
      return;
    }
  }else{
    try{
      const entrenadorRes = await pool.query("SELECT cedula FROM entrenadores where nombre LIKE $1",[entrenador]);
      await pool.query("delete from sesiones where entrenador=$1 and DATE_PART('week',TO_TIMESTAMP(fecha,'YYYY-MM-DD HH24:MI'))=DATE_PART('week',current_timestamp at time zone 'America/Bogota')",[entrenadorRes.rows[0].cedula]);
      response.status(200)
      .send({
        message: "Se borraron las sesiones del entrenador "+entrenador.replaceAll("%",'')+" de la semana actual",
      });
      return;
    }catch(exception){
      response.status(500)
      .send({
      message: "No se pudieron borrar las sesiones del entrenador "+entrenador.replaceAll("%",''),
      });
      return;
    }
  }
}

const borrarVentasSesionesEntrenador = async (request,response)=>{
  let entrenador = "%"+request.body.entrenador+"%";
  let fechaInicio = request.body.fechaInicio;
  let fechaFin = request.body.fechaFin;
  if(fechaInicio&&fechaFin){
    try{
      const entrenadorRes = await pool.query("SELECT cedula FROM entrenadores where nombre LIKE $1",[entrenador]);
      await pool.query("delete from ventas v where sesion in (select id from sesiones s where entrenador=$1 and TO_TIMESTAMP(s.fecha,'YYYY-MM-DD HH24:MI') BETWEEN TO_TIMESTAMP($2,'YYYY-MM-DD') AND TO_TIMESTAMP($3,'YYYY-MM-DD'))",[entrenadorRes.rows[0].cedula,fechaInicio,fechaFin]);
      response.status(200)
      .send({
        message: "Se borraron las ventas de sesiones del entrenador "+entrenador.replaceAll("%",'')+" entre el "+fechaInicio +" y el "+fechaFin,
      });
      return;
    }catch(exception){
      console.log(exception)
      response.status(500)
      .send({
      message: "No se pudieron borrar las ventas de sesiones del entrenador "+entrenador.replaceAll("%",''),
      });
      return;
    }
  }else{
    try{
      const entrenadorRes = await pool.query("SELECT cedula FROM entrenadores where nombre LIKE $1",[entrenador]);
      await pool.query("delete from ventas v where sesion in (select id from sesiones s where entrenador=$1 and and DATE_PART('week',TO_TIMESTAMP(s.fecha,'YYYY-MM-DD HH24:MI'))=DATE_PART('week',current_timestamp at time zone 'America/Bogota'))",[entrenadorRes.rows[0].cedula]);
      response.status(200)
      .send({
        message: "Se borraron las ventas de sesiones del entrenador "+entrenador.replaceAll("%",'')+" de la semana actual",
      });
      return;
    }catch(exception){
      response.status(500)
      .send({
      message: "No se pudieron borrar las ventas de sesiones del entrenador "+entrenador.replaceAll("%",''),
      });
      return;
    }
  }
}

const crearSesionDeIcs =  async (request, response)=>{
  let entrenador= "%"+request.body.entrenador+"%";
  let cliente = "%"+request.body.cliente+"%";
  let fecha = request.body.fecha;
  let asistio = request.body.asistio;
  let virtual=false;
  try{
    cliente=cliente.replaceAll('\n',"")
    if(cliente.includes("*")){
      asistio=false
      cliente=cliente.replace("*",'')
    }
    if(cliente.includes("+++")){
      virtual=true;
      cliente=cliente.replace("+++",'');
    }
    if(entrenador && cliente && fecha){
      const clienteRes = await pool.query("SELECT cedula,anticipado,precio_sesion FROM clientes WHERE nombre LIKE $1",[cliente]);
      const entrenadorRes = await pool.query("SELECT cedula FROM entrenadores where nombre LIKE $1",[entrenador]);
      if(entrenadorRes.rowCount<1){
        response.status(400)
          .send({
            message: "El entrenador "+ entrenador.replaceAll("%",'') +" no existe",
            code:1
          });
          return;
      }if(clienteRes.rowCount<1 ){
        response.status(400)
        .send({
          message: "El cliente "+ cliente.replaceAll("%",'') +" no existe en la fecha" +fecha,
          code:2
        });
        return;
      }
      else{
        let cliente2 = clienteRes.rows[0].cedula
        let entrenador2 = entrenadorRes.rows[0].cedula
        let esAnticipado = clienteRes.rows[0].anticipado
        let precioSesion = clienteRes.rows[0].precio_sesion
        const countRes1 = await pool.query("SELECT COUNT(*) FROM SESIONES WHERE (entrenador=$1 and cliente=$2) AND TO_TIMESTAMP(fecha,'YYYY-MM-DD HH24:MI') BETWEEN TO_TIMESTAMP($3,'YYYY-MM-DD HH24:MI') AND TO_TIMESTAMP($4,'YYYY-MM-DD HH24:MI') + interval '74 minutes' ", [entrenador2,cliente2,fecha, fecha]);
        const countRes = await pool.query("SELECT COUNT(*) FROM SESIONES WHERE (entrenador=$1) AND TO_TIMESTAMP(fecha,'YYYY-MM-DD HH24:MI') BETWEEN TO_TIMESTAMP($2,'YYYY-MM-DD HH24:MI') AND TO_TIMESTAMP($3,'YYYY-MM-DD HH24:MI') + interval '59 minutes' ", [entrenador2,fecha, fecha]);
        const countRes2 = await pool.query("SELECT COUNT(*) FROM SESIONES WHERE (cliente=$1) AND TO_TIMESTAMP(fecha,'YYYY-MM-DD HH24:MI') BETWEEN TO_TIMESTAMP($2,'YYYY-MM-DD HH24:MI') AND TO_TIMESTAMP($3,'YYYY-MM-DD HH24:MI') + interval '74 minutes' ", [cliente2,fecha, fecha]);
        if(countRes1.rows[0].count>0){
          response.status(200).send({message:"Ya se cargo dicha sesion"})
        }else{
          if(countRes.rows[0].count>0){
              response.status(400).send({
                message: "Ya hay sesiones agendadas para el entrenador "+entrenador.replaceAll("%",'')+" en el horario: "+fecha+ " con un cliente distinto a: "+cliente.replaceAll("%",''),
                code: 3
            })
            return;
          }
          if(countRes2.rows[0].count>0){
              response.status(400).send({
                message: "Ya hay sesiones agendadas para el cliente "+cliente.replaceAll("%",'')+" en el horario: "+fecha+ " con un entrenador distinto",
                code: 3
            })
            return;
          }
          else{
            let message = "Sesion Agendada Exitosamente"
            let resV = await pool.query("SELECT precio FROM productos WHERE codigo='SESV'")
            let sesionId = await pool.query("INSERT INTO SESIONES(entrenador,cliente,fecha,asistio,virtual) VALUES($1,$2,$3,$4,$5) RETURNING ID",[entrenador2,cliente2,fecha,asistio,virtual])
            if(!esAnticipado){
              message+=" Y venta registrada exitosamente"
              if(precioSesion!==null && precioSesion!==undefined){
                if(virtual){
                  precioSesion = resV.rows[0].precio
                }
                await pool.query("INSERT INTO ventas(cliente,fecha,valor,usuario,sesion) VALUES ($1,$2,$3,$4,$5) RETURNING id",[cliente2,fecha,precioSesion,request.tokenData,sesionId.rows[0].id]);
              }
              else{
                if(virtual){
                  await pool.query("INSERT INTO ventas(cliente,fecha,valor,usuario,sesion) VALUES ($1,$2,$3,$4,$5) RETURNING id",[cliente2,fecha,resV.rows[0].precio,request.tokenData,sesionId.rows[0].id]);
                }else{
                  let ses=await pool.query("SELECT precio FROM productos WHERE codigo='SES'");
                  await pool.query("INSERT INTO ventas(cliente,fecha,valor,usuario,sesion) VALUES ($1,$2,$3,$4,$5) RETURNING id",[cliente2,fecha,ses.rows[0].precio,request.tokenData,sesionId.rows[0].id]);
                }
              }
            }
            response.status(200).send({message:message});
            return;
          }
        }
      }
    }
  }catch (e){
    console.log(e)
      response.status(400).send({
        message: e
    });
    return;
  }
}

const crearSesion = async (request, response) =>{
    let entrenador = request.body.entrenador;
    let cliente = request.body.cliente;
    let fecha = request.body.fecha;
    let asistio = request.body.asistio;
    let virtual = request.body.virtual;
    if(entrenador && cliente && fecha){
      try{
        let clienteRes = await pool.query("SELECT anticipado,precio_sesion from clientes where cedula=$1",[cliente])
        let results = await pool.query("SELECT COUNT(*) FROM SESIONES WHERE (entrenador=$1 OR cliente=$2) AND virtual=false AND TO_TIMESTAMP(fecha,'YYYY-MM-DD HH24:MI') BETWEEN TO_TIMESTAMP($3,'YYYY-MM-DD HH24:MI') AND TO_TIMESTAMP($4,'YYYY-MM-DD HH24:MI') + interval '74 minutes' ", [entrenador, cliente, fecha,fecha]);
        let sesionPrecio = await pool.query("SELECT precio FROM productos WHERE codigo='SESV'")
        if(results.rows[0].count>0){
          response.status(400).send({
              message: "Ya hay sesiones agendadas en dicho horario"
          })
          return;
        }else{
          let sesion = await pool.query("INSERT INTO SESIONES(entrenador,cliente,fecha,asistio,virtual) VALUES($1,$2,$3,$4,$5) RETURNING id",[entrenador,cliente,fecha,asistio,virtual]);
          if(!clienteRes.rows[0].anticipado){
            let precioSesion;
            if(clienteRes.rows[0].precio_sesion!=null&&clienteRes.rows[0].precio_sesion!=undefined){
              precioSesion=clienteRes.rows[0].precio_sesion;
            }else{
              precioSesion=sesionPrecio.rows[0].precio
            }
            await pool.query("INSERT INTO ventas(cliente,fecha,valor,usuario,sesion) VALUES ($1,$2,$3,$4,$5) RETURNING id",[cliente,fecha,precioSesion,request.tokenData,sesion.rows[0].id]);
          }
          response.status(200).send({message:"Sesion Agendada Exitosamente"});
          return;
        }
      }catch(error){
        console.log(error)
        response.status(500)
                    .send({
                      message: error
                    });
                    return;
      }
    }else{
      response.status(400).json({message:"Campos Faltantes"});
    }
};

const getSesiones = (request,response) =>{
  pool.query("SELECT ses.asistio,ses.id,ses.entrenador,ses.cliente,ses.fecha,ent.color as color, \
  ent.nombre as nombreEntrenador,cli.nombre as nombreCliente, \
  TO_CHAR(TO_TIMESTAMP(ses.fecha,'YYYY-MM-DD HH24:MI') + interval '75 minutes','YYYY-MM-DD HH24:MI') as fechaFin, ses.virtual \
  FROM sesiones as ses INNER JOIN entrenadores AS ent ON ses.entrenador=ent.cedula INNER JOIN clientes AS cli on ses.cliente=cli.cedula \
  where TO_TIMESTAMP(ses.fecha,'YYYY-MM-DD HH24:MI') >= date_trunc('month', current_timestamp at time zone 'America/Bogota' - interval '2' month)",(error,results)=>{
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


module.exports = {borrarVentasSesionesEntrenador,crearSesion,desagendarSesion, registrarAsistencia, getSesiones, crearSesionDeIcs,borrarSesionesEntrenador}