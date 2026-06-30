const Pool = require("pg").Pool
const nodemailer = require('nodemailer');
const mimemessage = require('mimemessage');
const Imap =require('node-imap');




const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
  ssl: false

  });

const LOG_MODULE = 'sesiones.controller';

const sesionesLog = (level, phase, message, meta = {}) => {
  const entry = {
    ts: new Date().toISOString(),
    module: LOG_MODULE,
    level,
    phase,
    message,
    ...(Object.keys(meta).length ? { meta } : {}),
  };
  const line = JSON.stringify(entry);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
};

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
      await pool.query("delete from sesiones where entrenador=$1 and fecha BETWEEN TO_TIMESTAMP($2,'YYYY-MM-DD') AND TO_TIMESTAMP($3,'YYYY-MM-DD')",[entrenadorRes.rows[0].cedula,fechaInicio,fechaFin]);
      response.status(200)
      .send({
        message: "Se borraron las sesiones del entrenador "+entrenador.replaceAll("%",'')+" entre el "+fechaInicio +" y el "+fechaFin,
      });
      return;
    }catch(exception){
      sesionesLog('error', 'borrarSesionesEntrenador', 'Failed to delete sessions by date range', {
        entrenador: entrenador.replaceAll('%', ''),
        fechaInicio,
        fechaFin,
        error: exception?.message || String(exception),
      });
      response.status(500)
      .send({
      message: "No se pudieron borrar las sesiones del entrenador "+entrenador.replaceAll("%",''),
      });
      return;
    }
  }else{
    try{
      const entrenadorRes = await pool.query("SELECT cedula FROM entrenadores where nombre LIKE $1",[entrenador]);
      await pool.query("delete from sesiones where entrenador=$1 and DATE_PART('week',fecha)=DATE_PART('week',current_timestamp at time zone 'America/Bogota')",[entrenadorRes.rows[0].cedula]);
      response.status(200)
      .send({
        message: "Se borraron las sesiones del entrenador "+entrenador.replaceAll("%",'')+" de la semana actual",
      });
      return;
    }catch(exception){
      sesionesLog('error', 'borrarSesionesEntrenador', 'Failed to delete sessions for current week', {
        entrenador: entrenador.replaceAll('%', ''),
        error: exception?.message || String(exception),
      });
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
      await pool.query("delete from ventas v where sesion in (select id from sesiones s where entrenador=$1 and s.fecha BETWEEN TO_TIMESTAMP($2,'YYYY-MM-DD') AND TO_TIMESTAMP($3,'YYYY-MM-DD'))",[entrenadorRes.rows[0].cedula,fechaInicio,fechaFin]);
      response.status(200)
      .send({
        message: "Se borraron las ventas de sesiones del entrenador "+entrenador.replaceAll("%",'')+" entre el "+fechaInicio +" y el "+fechaFin,
      });
      return;
    }catch(exception){
      sesionesLog('error', 'borrarVentasSesionesEntrenador', 'Failed to delete session sales by date range', {
        entrenador: entrenador.replaceAll('%', ''),
        fechaInicio,
        fechaFin,
        error: exception?.message || String(exception),
      });
      response.status(500)
      .send({
      message: "No se pudieron borrar las ventas de sesiones del entrenador "+entrenador.replaceAll("%",''),
      });
      return;
    }
  }else{
    try{
      const entrenadorRes = await pool.query("SELECT cedula FROM entrenadores where nombre LIKE $1",[entrenador]);
      await pool.query("delete from ventas v where sesion in (select id from sesiones s where entrenador=$1 and and DATE_PART('week',s.fecha)=DATE_PART('week',current_timestamp at time zone 'America/Bogota'))",[entrenadorRes.rows[0].cedula]);
      response.status(200)
      .send({
        message: "Se borraron las ventas de sesiones del entrenador "+entrenador.replaceAll("%",'')+" de la semana actual",
      });
      return;
    }catch(exception){
      sesionesLog('error', 'borrarVentasSesionesEntrenador', 'Failed to delete session sales for current week', {
        entrenador: entrenador.replaceAll('%', ''),
        error: exception?.message || String(exception),
      });
      response.status(500)
      .send({
      message: "No se pudieron borrar las ventas de sesiones del entrenador "+entrenador.replaceAll("%",''),
      });
      return;
    }
  }
}

const enviarCorreoSesionesVencidas = async (cliente) => {
  let cedula = cliente.cedula;
  let sesionesVentasProductos;
  let sesionesVentasPaquetes;
  
  const dbClient = await pool.connect();
  let enviarCorreo = false;
  let paquete, precio;

  try {
    sesionesLog('info', 'enviarCorreoSesionesVencidas', 'Starting prepaid session balance check', { cedula });
    await dbClient.query("BEGIN");

    // 1. EL BLOQUEO Y LECTURA DE FECHA: Obtenemos cuándo fue la última vez que se le envió un correo
    // NOTA: Debes crear la columna 'fecha_ultimo_correo' en tu tabla 'clientes'
    let clienteQuery = await dbClient.query(
      "SELECT fecha_ultimo_correo FROM clientes WHERE cedula = $1 FOR UPDATE", 
      [cedula]
    );

    // Si el cliente no existe, salimos
    if (clienteQuery.rows.length === 0) {
      sesionesLog('warn', 'enviarCorreoSesionesVencidas', 'Client not found, skipping', { cedula });
      await dbClient.query("ROLLBACK");
      dbClient.release();
      return;
    }

    let fechaUltimoCorreo = clienteQuery.rows[0].fecha_ultimo_correo;
    let yaSeEnvioHoy = false;

    // Validamos si la fecha del último correo es el día de hoy
    if (fechaUltimoCorreo) {
      // Formateamos ambas fechas a YYYY-MM-DD para comparar solo el día (hora de Bogotá -05:00)
      let fechaUltima = new Date(fechaUltimoCorreo).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' });
      let fechaHoy = new Date().toLocaleDateString('es-CO', { timeZone: 'America/Bogota' });
      
      if (fechaUltima === fechaHoy) {
        yaSeEnvioHoy = true;
      }
    }
    
    let totalSesionesTomadas = await dbClient.query("select count(*) as sesiones from sesiones s where s.cliente=$1 and virtual=false", [cedula]);
    let totalSesionesVirtualesTomadas = await dbClient.query("select count(*) as sesiones from sesiones s where s.cliente=$1 and virtual=true", [cedula]);
    
    sesionesVentasProductos = await dbClient.query("select coalesce(sum(vp.cantidad),0) as sesiones from ventas v \
      inner join ventas_productos vp on vp.venta = v.id \
      where vp.producto like '%SES%' and v.cliente=$1", [cedula]);
      
    sesionesVentasPaquetes = await dbClient.query("select coalesce(sum(pp.cantidad*vp.cantidad),0) as sesiones from ventas v \
      inner join ventas_paquetes vp on vp.venta = v.id \
      inner join productos_paquete pp on pp.codigo_paquete = vp.paquete where v.cliente=$1 and pp.codigo_producto like '%SES%'", [cedula]);
        
    let ultimaVenta = await dbClient.query("SELECT TO_TIMESTAMP(ve.fecha,'yyyy-mm-dd HH24:MI:SS'), vepa.paquete, vepa.cantidad, pa.precio FROM VENTAS ve \
      INNER JOIN VENTAS_PAQUETES vepa ON ve.id=vepa.venta \
      INNER JOIN PAQUETES pa ON pa.codigo=vepa.paquete \
      INNER JOIN PRODUCTOS_PAQUETE pp ON pp.codigo_paquete = pa.codigo \
      WHERE pp.codigo_producto LIKE '%SES%' and ve.cliente=$1 \
      order by ve.fecha desc \
      fetch first 1 rows only", [cedula]);

    if (ultimaVenta.rows.length === 0) {
      sesionesLog('info', 'enviarCorreoSesionesVencidas', 'No session package sales found, skipping auto-renewal', { cedula });
      await dbClient.query("COMMIT"); 
    } else {
      paquete = ultimaVenta.rows[0].paquete;
      precio = ultimaVenta.rows[0].precio;
      
      let sesionesPagadas = (parseFloat(sesionesVentasProductos.rows[0].sesiones) + parseFloat(sesionesVentasPaquetes.rows[0].sesiones));
      let sesionesTomadas2 = (parseFloat(totalSesionesTomadas.rows[0].sesiones) + parseFloat(totalSesionesVirtualesTomadas.rows[0].sesiones));
      let sesionesRestantes = (sesionesPagadas - sesionesTomadas2);
      
      if (sesionesRestantes <= 0) {
        sesionesLog('info', 'enviarCorreoSesionesVencidas', 'Calling registrar_venta_safe for insert a new sale', { cedula, paquete, precio });
        await dbClient.query("CALL registrar_venta_safe($1, $2, $3, $4)", [
          cedula, paquete, precio, 3
        ]);

        // 2. APLICAR LA REGLA DEL CORREO
        if (!yaSeEnvioHoy) {
          await dbClient.query("UPDATE clientes SET fecha_ultimo_correo = (current_timestamp at time zone 'America/Bogota') WHERE cedula = $1", [cedula]);
          enviarCorreo = true;
          sesionesLog('info', 'enviarCorreoSesionesVencidas', 'Auto-renewal sale registered, email queued', {
            cedula,
            paquete,
            sesionesPagadas,
            sesionesTomadas: sesionesTomadas2,
          });
        } else {
          sesionesLog('info', 'enviarCorreoSesionesVencidas', 'Auto-renewal sale registered, email skipped (already sent today)', {
            cedula,
            paquete,
          });
        }

      } else {
        sesionesLog('info', 'enviarCorreoSesionesVencidas', 'Client still has remaining sessions, no auto-renewal', {
          cedula,
          sesionesRestantes,
        });
      }

      await dbClient.query("COMMIT");
    }

  } catch (err) {
    try { await dbClient.query("ROLLBACK"); } catch (rollbackErr) {
      sesionesLog('error', 'enviarCorreoSesionesVencidas', 'Rollback failed', {
        cedula,
        error: rollbackErr?.message || String(rollbackErr),
      });
    }
    sesionesLog('error', 'enviarCorreoSesionesVencidas', 'Transaction failed', {
      cedula,
      error: err?.message || String(err),
      stack: err?.stack,
    });
    enviarCorreo = false; 
  } finally {
    dbClient.release();
  }

  // 3. ENVÍO DEL CORREO (Se ejecuta solo si enviarCorreo es true)
  if (enviarCorreo) {
    sesionesLog('info', 'enviarCorreoSesionesVencidas', 'Sending session renewal notification email', {
      cedula,
      email: cliente.email,
    });

    let mailData = {
      from: process.env.MAIL_ACCOUNT,
      to: cliente.email,
      subject: "Notificacion de Estado de Cuentas",
      text: "Estado de Cuentas",
      html: '<!doctype html> \
      <html ⚡4email> \
        <head> \
          <meta charset="utf-8"> \
          <script async src="https://cdn.ampproject.org/v0.js"></script> \
          <script async custom-element="amp-anim" src="https://cdn.ampproject.org/v0/amp-anim-0.1.js"></script> \
        </head> \
        <body> \
          <div class="container"> \
            <h2 class="header">Notificación de Consumo de Sesiones Strength Club</h2> \
            <p class="content">Estimado/a <strong>' + cliente.nombre + '</strong>,</p> \
            <p class="content">Te informamos que has consumido la totalidad de las sesiones de su paquete adquirido. Para tu comidad, el sistema te ha asignado un nuevo paquete de sesiones igual al último que compraste.</p> \
            <p class="content">Si tienes alguna duda o necesitas asistencia, no dudes en contactarnos.</p> \
            <p class="footer">Atentamente,<br>Equipo de Atención al Cliente</p> \
          </div> \
        </body> \
      </html>'
    };

    try {
      var imap = new Imap({
        user: process.env.MAIL_ACCOUNT,
        password: process.env.MAIL_PASSWORD,
        host: process.env.IMAP_MAIL_HOST,
        port: process.env.IMAP_MAIL_PORT,
        tls: true
      });

      const transporter = nodemailer.createTransport({
        port: process.env.MAIL_PORT,
        host: process.env.MAIL_HOST,
        secureConnection: false,
        auth: {
          user: process.env.MAIL_ACCOUNT,
          pass: process.env.MAIL_PASSWORD,
        }
      });

      let info = await transporter.sendMail(mailData);
      sesionesLog('info', 'enviarCorreoSesionesVencidas', 'Email sent successfully', {
        cedula,
        messageId: info.messageId,
      });

      // Preparar flujo IMAP
      imap.once('ready', function () {
        imap.openBox('INBOX.Sent', false, (err, box) => {
          if (err) {
            sesionesLog('warn', 'enviarCorreoSesionesVencidas', 'Failed to open IMAP Sent folder', {
              cedula,
              error: err.message,
            });
            return;
          }

          try {
            let msg = mimemessage.factory({
              contentType: 'multipart/alternate',
              body: []
            });

            let htmlEntity = mimemessage.factory({
              contentType: 'text/html;charset=utf-8',
              body: mailData.html
            });

            let plainEntity = mimemessage.factory({
              body: mailData.text
            });

            msg.header('From', mailData.from);
            msg.header('To', mailData.to);
            msg.header('Subject', mailData.subject);
            msg.header('Date', new Date());

            msg.body.push(plainEntity);
            msg.body.push(htmlEntity);

            imap.append(msg.toString(), (err) => {
              if (err) {
                sesionesLog('warn', 'enviarCorreoSesionesVencidas', 'Failed to append email to IMAP Sent folder', {
                  cedula,
                  error: err.message,
                });
              }
              imap.end();
            });
          } catch (imapBuildErr) {
            sesionesLog('warn', 'enviarCorreoSesionesVencidas', 'Failed to build IMAP message', {
              cedula,
              error: imapBuildErr.message,
            });
            imap.end();
          }
        });
      });

      imap.once('error', (err) => {
        sesionesLog('warn', 'enviarCorreoSesionesVencidas', 'IMAP connection error', {
          cedula,
          error: err.message,
        });
      });

      imap.connect();
    } catch (error) {
      sesionesLog('error', 'enviarCorreoSesionesVencidas', 'Failed to send email', {
        cedula,
        error: error?.message || String(error),
      });
    }
  }

  return;
};

const cargaSesionesDeIcs = async (request, response)=>{

  let elementos = request.body.sesiones;
  let errorElements = []
  let successElements = []

  sesionesLog('info', 'cargaSesionesDeIcs', 'ICS batch import started', { total: elementos?.length ?? 0 });

  try{
    await Promise.all(elementos.map(async (element)=>{
      try {
        let response;
        element.tokenData=request.tokenData
        response = await crearSesionDeIcs(element);
        if(response.success){
          successElements.push(response.descripcion)
        }else{
          errorElements.push(response.descripcion)
        }
      } catch (error) {
        sesionesLog('error', 'cargaSesionesDeIcs', 'Failed to process ICS session item', {
          cliente: element?.cliente,
          entrenador: element?.entrenador,
          fecha: element?.fecha,
          error: error?.message || String(error),
        });
        errorElements.push({descripcion:"Error insertando el cliente "+element.cliente+" el dia: "+element.fecha+" con el entrenador:"+element.entrenador,
          success:false
        })
      }
    }))
    sesionesLog('info', 'cargaSesionesDeIcs', 'ICS batch import finished', {
      successCount: successElements.length,
      errorCount: errorElements.length,
      entrenador:element?.entrenador
    });
    response.status(200).send({
      successClients:successElements,
      errorClients:errorElements
    })
    return
  }catch(error){
    sesionesLog('error', 'cargaSesionesDeIcs', 'ICS batch import failed', {
      error: error?.message || String(error),
    });
    response.status(500)
        .send({
          message: error
        });
        return;
  }

}

function formatDateToCustom(inputDate) {
  const date = new Date(inputDate);

  // Extract components
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Ensure two digits
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  // Format as "YYYY-MM-DD HH24:MI"
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

const crearSesionDeIcs =  async (request)=>{
  let entrenador= "%"+request.entrenador+"%";
  let cliente = "%"+request.cliente+"%";
  let fecha = formatDateToCustom(request.fecha);
  let asistio = request.asistio;
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
      const clienteRes = await pool.query("SELECT cedula,anticipado,precio_sesion,nombre,email FROM clientes WHERE nombre LIKE $1",[cliente]);
      const entrenadorRes = await pool.query("SELECT cedula FROM entrenadores where nombre LIKE $1",[entrenador]);
      if(entrenadorRes.rowCount<1){
          return { descripcion: "El entrenador "+ entrenador.replaceAll("%",'') +" no existe",success: false};
      }if(clienteRes.rowCount<1 ){
        return {descripcion: "El cliente "+ cliente.replaceAll("%",'') +" no existe en la fecha" +fecha,success:false};
      }
      else{
        let cliente2 = clienteRes.rows[0].cedula
        let entrenador2 = entrenadorRes.rows[0].cedula
        let esAnticipado = clienteRes.rows[0].anticipado
        let precioSesion = clienteRes.rows[0].precio_sesion
        const countRes1 = await pool.query("SELECT COUNT(*) FROM SESIONES WHERE (entrenador=$1 and cliente=$2) AND fecha BETWEEN TO_TIMESTAMP($3,'YYYY-MM-DD HH24:MI') AND TO_TIMESTAMP($4,'YYYY-MM-DD HH24:MI') + interval '74 minutes' ", [entrenador2,cliente2,fecha, fecha]);
        const countRes = await pool.query("SELECT COUNT(*) FROM SESIONES WHERE (entrenador=$1) AND fecha BETWEEN TO_TIMESTAMP($2,'YYYY-MM-DD HH24:MI') AND TO_TIMESTAMP($3,'YYYY-MM-DD HH24:MI') + interval '59 minutes' ", [entrenador2,fecha, fecha]);
        const countRes2 = await pool.query("SELECT COUNT(*) FROM SESIONES WHERE (cliente=$1) AND fecha BETWEEN TO_TIMESTAMP($2,'YYYY-MM-DD HH24:MI') AND TO_TIMESTAMP($3,'YYYY-MM-DD HH24:MI') + interval '74 minutes' ", [cliente2,fecha, fecha]);
        
        if(countRes1.rows[0].count>0){
          return {descripcion:"Ya se cargo la sesion del cliente "+cliente2+" el dia "+fecha+"con el entrenador "+entrenador2,success: false};
        }else{
          if(countRes.rows[0].count>0){
              return{
                descripcion: "Ya hay sesiones agendadas para el entrenador "+entrenador.replaceAll("%",'')+" en el horario: "+fecha+ " con un cliente distinto a: "+cliente.replaceAll("%",''),
                success: false
            }
          }
          if(countRes2.rows[0].count>0){
              return{
                descripcion: "Ya hay sesiones agendadas para el cliente "+cliente.replaceAll("%",'')+" en el horario: "+fecha+ " con un entrenador distinto",
                success: false
            }
          }
          else{
            let message = "Sesion Agendada Exitosamente"
            let resV = await pool.query("SELECT precio FROM productos WHERE codigo='SESV'")
            let sesionId = await pool.query("INSERT INTO SESIONES(entrenador,cliente,fecha,asistio,virtual) VALUES($1,$2,TO_TIMESTAMP($3,'YYYY-MM-DD HH24:MI'),$4,$5) RETURNING ID",[entrenador2,cliente2,fecha,asistio,virtual==null?false:virtual])
            if(!esAnticipado){
              message+=" Y venta registrada exitosamente"
              if(precioSesion!==null && precioSesion!==undefined){
                if(virtual){
                  precioSesion = resV.rows[0].precio
                }
                 let id = await pool.query("INSERT INTO ventas(cliente,fecha,valor,usuario,sesion) VALUES ($1,$2,$3,$4,$5) RETURNING id",[cliente2,fecha,precioSesion,request.tokenData,sesionId.rows[0].id]);
                 await pool.query("INSERT INTO ventas_productos (venta, producto, cantidad) VALUES($1, 'SES', 1)",[id.rows[0].id])
              }
              else{
                if(virtual){
                  let id = await pool.query("INSERT INTO ventas(cliente,fecha,valor,usuario,sesion) VALUES ($1,$2,$3,$4,$5) RETURNING id",[cliente2,fecha,resV.rows[0].precio,request.tokenData,sesionId.rows[0].id]);
                  await pool.query("INSERT INTO ventas_productos (venta, producto, cantidad) VALUES($1, 'SES', 1)",[id.rows[0].id])

                }else{
                  let ses=await pool.query("SELECT precio FROM productos WHERE codigo='SES'");
                  let id = await pool.query("INSERT INTO ventas(cliente,fecha,valor,usuario,sesion) VALUES ($1,$2,$3,$4,$5) RETURNING id",[cliente2,fecha,ses.rows[0].precio,request.tokenData,sesionId.rows[0].id]);
                  await pool.query("INSERT INTO ventas_productos (venta, producto, cantidad) VALUES($1, 'SES', 1)",[id.rows[0].id])
                }
              }
            }else{
                sesionesLog('info', 'crearSesionDeIcs', 'Prepaid client session created, checking auto-renewal', {
                  cedula: cliente2,
                  fecha,
                  entrenadorCedula: entrenador2,
                });
                await enviarCorreoSesionesVencidas(clienteRes.rows[0])
            }
            sesionesLog('info', 'crearSesionDeIcs', 'Session created from ICS', {
              cedula: cliente2,
              fecha,
              entrenadorCedula: entrenador2,
              anticipado: esAnticipado,
              virtual: virtual == null ? false : virtual,
              ventaRegistrada: !esAnticipado,
            });

            return{descripcion:message,success:true};
          }
        }
      }
    }
  }catch (e){
    sesionesLog('error', 'crearSesionDeIcs', 'Unexpected error creating session from ICS', {
      cliente: request?.cliente,
      entrenador: request?.entrenador,
      fecha: request?.fecha,
      error: e?.message || String(e),
      stack: e?.stack,
    });
    return{descripcion: e,success:false};
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
        let clienteRes = await pool.query("SELECT cedula,anticipado,precio_sesion,nombre,email from clientes where cedula=$1",[cliente])
        let results = await pool.query("SELECT COUNT(*) FROM SESIONES WHERE (entrenador=$1 OR cliente=$2) AND virtual=false AND fecha BETWEEN TO_TIMESTAMP($3,'YYYY-MM-DD HH24:MI') AND TO_TIMESTAMP($4,'YYYY-MM-DD HH24:MI') + interval '74 minutes' ", [entrenador, cliente, fecha,fecha]);
        let sesionPrecio = await pool.query("SELECT precio FROM productos WHERE codigo='SESV'")
        if(results.rows[0].count>0){
          response.status(400).send({
              message: "Ya hay sesiones agendadas en dicho horario"
          })
          return;
        }else{
          let sesion = await pool.query("INSERT INTO SESIONES(entrenador,cliente,fecha,asistio,virtual) VALUES($1,$2,TO_TIMESTAMP($3,'YYYY-MM-DD HH24:MI'),$4,$5) RETURNING id",[entrenador,cliente,fecha,asistio,virtual==null?false:virtual]);
          if(!clienteRes.rows[0].anticipado){
            let precioSesion;
            if(clienteRes.rows[0].precio_sesion!=null&&clienteRes.rows[0].precio_sesion!=undefined){
              precioSesion=clienteRes.rows[0].precio_sesion;
            }else{
              precioSesion=sesionPrecio.rows[0].precio
            }
            await pool.query("INSERT INTO ventas(cliente,fecha,valor,usuario,sesion) VALUES ($1,$2,$3,$4,$5) RETURNING id",[cliente,fecha,precioSesion,request.tokenData,sesion.rows[0].id]);
          }else{
            // await enviarCorreoSesionesVencidas(clienteRes.rows[0])
          }
          response.status(200).send({message:"Sesion Agendada Exitosamente"});
          return;
        }
      }catch(error){
        sesionesLog('error', 'crearSesion', 'Failed to create session', {
          entrenador,
          cliente,
          fecha,
          error: error?.message || String(error),
        });
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

const getSesiones = async (request,response) =>{
  let res;
  try {
    res = await pool.query("SELECT ses.asistio,ses.id,ses.entrenador,ses.cliente,TO_CHAR(ses.fecha, 'YYYY-MM-DD HH24:MI') AS fecha,ent.color AS color,ent.nombre AS nombreEntrenador,cli.nombre AS nombreCliente,TO_CHAR(ses.fecha + INTERVAL '75 minutes', 'YYYY-MM-DD HH24:MI') AS fechaFin,ses.virtual \
FROM sesiones AS ses \
INNER JOIN entrenadores AS ent ON ses.entrenador = ent.cedula \
INNER JOIN clientes AS cli ON ses.cliente = cli.cedula \
WHERE ses.fecha >= (current_date - INTERVAL '2 month')")

          response.status(200).send({sesiones:res.rows});
  } catch (error) {
    sesionesLog('error', 'getSesiones', 'Failed to fetch sessions', {
      error: error?.message || String(error),
    });
    response.status(500)
            .send({
              message: error
            });
  }
  return
}


module.exports = {borrarVentasSesionesEntrenador,crearSesion,desagendarSesion, registrarAsistencia, getSesiones, cargaSesionesDeIcs,borrarSesionesEntrenador}