var jwt = require("jsonwebtoken");
var bcrypt = require("bcrypt");
const Pool = require("pg").Pool
const nodemailer = require('nodemailer');
const util = require('util');


const transporter = nodemailer.createTransport({
  port: 587,
  host: "smtp-mail.outlook.com",
  secureConnection: false,
  tls: {
     ciphers:'SSLv3'
  },
  auth: {
    user: 'david.fonsecar@techrea.com',
    pass: 'Dark.orbit99',
  }
});

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

  function sendEmailPromise(mailData,errors,cliente){
    return new Promise((resolve)=>{
      transporter.sendMail(mailData,(err)=>{
        if(err){
          errors.push({cliente:cliente.nombre,error:err});
        }
        return resolve(errors)
      })
    })
  }

  const sendAllEmail = async (request, response) =>{
    try{
      let query = "select c.cedula, c.nombre, c.email, sum(v.valor) as debito, q2.valor as abonos, q2.valor-sum(v.valor) as saldo from clientes c \
      left join ventas v on v.cliente = c.cedula \
      left join \
      (	select c2.cedula, sum(a.valor) as valor \
        from clientes c2 \
        inner join abonos a on c2.cedula=a.cliente \
        group by c2.cedula) as q2 on q2.cedula=c.cedula \
      group by c.cedula, c.nombre,c.email, q2.valor"
      let cuentas = await pool.query(query);
      let errores = []
      cuentas.rows.forEach(async cliente => {
        let htmlRow = ""
        let ventas = await pool.query("SELECT fecha, valor from ventas where cliente=$1",[cliente.cedula])
        ventas.rows.forEach(venta =>{
          htmlRow+='<tr><td style="border:1px solid black">'+cliente.nombre+'</td>'
          htmlRow+='<td style="border:1px solid black">'+venta.fecha+'</td>'
          htmlRow+='<td style="border:1px solid black">$'+venta.valor+'</td></tr>'
        })

        let mailData = {
          from: "strengthclub@zohomail.com",
          to: cliente.email,
          subject: "Notificacion de Deudas",
          text : "Prueba",
          html: '<!doctype html> \
          <html ⚡4email> \
            <head> \
              <meta charset="utf-8"> \
              <style amp4email-boilerplate>body{visibility:hidden}</style> \
              <script async src="https://cdn.ampproject.org/v0.js"></script> \
              <script async custom-element="amp-anim" src="https://cdn.ampproject.org/v0/amp-anim-0.1.js"></script> \
            </head> \
            <body> \
            <h2>Estado de Cuenta Strength Club</h2> \
            <table style="width:100%; border:1px solid black"> \
              <tr> \
                <th style="border:1px solid black">Nombre</th> \
                <th style="border:1px solid black">Fecha</th> \
                <th style="border:1px solid black">Precio</th> \
              </tr>'+htmlRow+' \
              <tr> \
                <th style="border:1px solid black"></th>\
                <th style="border:1px solid black">Total Deuda:</th>\
                <th style="border:1px solid black">$'+cliente.debito+'</th>\
              </tr> \
              <tr> \
                <th style="border:1px solid black"></th>\
                <th style="border:1px solid black">Total Abonos:</th>\
                <th style="border:1px solid black">$'+cliente.abonos+'</th>\
              </tr> \
              <tr> \
                <th style="border:1px solid black"></th>\
                <th style="border:1px solid black">Total Saldo:</th>\
                <th style="border:1px solid black">$'+cliente.saldo+'</th>\
              </tr> \
            </table> \
            </body> \
          </html>'
          
        }
        errores = await sendEmailPromise(mailData,errores,cliente);
      });
      if(errores.length>0){
        response.status(206)
        .send({
          message: "Existen clientes que no se notificaron correctamente",
          errores:errores
        });
        return;
      }
      else{
        response.status(200)
        .send({
          message: "Clientes notificados exitosamente"
        });
      }
    }catch (error){
      response.status(500)
      .send({
        message: error
      });
    }
  }

  const sendEmail = async (request,response)=>{
    let cedula = request.body.cedula;
    let fechaInicio = request.body.fechaInicio;
    let fechaFin = request.body.fechaFin;
    let query=""
    let cuenta;let ventas;let abonos;
    try {
    if(fechaInicio&&fechaFin){
      query = "select c.cedula, c.nombre, c.email, sum(v.valor) as debito, q2.valor as abonos, q2.valor-sum(v.valor) as saldo from clientes c \
      left join ventas v on v.cliente = c.cedula \
      left join \
      (	select c2.cedula, sum(a.valor) as valor \
        from clientes c2 \
        inner join abonos a on c2.cedula=a.cliente \
        where to_timestamp( a.fecha ,'yyyy-mm-dd HH24:MI:SS') between to_timestamp($2 ,'yyyy-mm-dd') and to_timestamp($3 ,'yyyy-mm-dd') \
        group by c2.cedula) as q2 on q2.cedula=c.cedula \
        where c.cedula=$1 and (to_timestamp(v.fecha ,'yyyy-mm-dd HH24:MI:SS') between to_timestamp($4 ,'yyyy-mm-dd') and to_timestamp($5 ,'yyyy-mm-dd')) \
      group by c.cedula, c.nombre,c.email, q2.valor"
      cuenta = await pool.query(query,[cedula,fechaInicio,fechaFin,fechaInicio,fechaFin]);
      ventas = await pool.query("SELECT fecha, valor from ventas where cliente=$1 and (to_timestamp(fecha ,'yyyy-mm-dd HH24:MI:SS') between to_timestamp($2 ,'yyyy-mm-dd') and to_timestamp( $3 ,'yyyy-mm-dd'))",[cedula,fechaInicio,fechaFin])
      abonos = await pool.query("SELECT fecha, valor from abonos where cliente=$1 and (to_timestamp(fecha ,'yyyy-mm-dd HH24:MI:SS') between to_timestamp($2 ,'yyyy-mm-dd') and to_timestamp( $3 ,'yyyy-mm-dd'))",[cedula,fechaInicio,fechaFin])
    }
    else{
      query = "select c.cedula, c.nombre, c.email, sum(v.valor) as debito, q2.valor as abonos, q2.valor-sum(v.valor) as saldo from clientes c \
      left join ventas v on v.cliente = c.cedula \
      left join \
      (	select c2.cedula, sum(a.valor) as valor \
        from clientes c2 \
        inner join abonos a on c2.cedula=a.cliente \
        group by c2.cedula) as q2 on q2.cedula=c.cedula \
        where c.cedula=$1 \
      group by c.cedula, c.nombre,c.email, q2.valor"
      cuenta = await pool.query(query,[cedula]);
      ventas = await pool.query("SELECT fecha, valor from ventas where cliente=$1",[cedula])
      abonos = await pool.query("SELECT fecha, valor from abonos where cliente=$1",[cedula])
    }
    query = "select c.nombre, q1.adquiridas, count(s.cliente) as tomadas,q1.adquiridas-count(s.cliente) as total from clientes c \
    left join sesiones s on c.cedula = s.cliente \
    left join ( \
    select cedula, sum(cantidad) as adquiridas from \
    (select cedula, cantidad \
    from (select c.cedula, count(*) as cantidad from clientes c \
      left join ventas v on v.cliente =c.cedula \
      inner join ventas_productos vp on vp.venta =v.id and vp.producto='SES01' group by c.cedula) q1 \
    union \
    (select q1.cedula, sum(q1.cantidad) as cantidad from \
      (select c.cedula, pp.cantidad from clientes c \
      left join ventas v on c.cedula = v.cliente \
      inner join ventas_paquetes vp on vp.venta =v.id \
      inner join productos_paquete pp on pp.codigo_paquete =vp.paquete and pp.codigo_producto = 'SES01' \
      group by c.cedula,pp.cantidad) q1 group by q1.cedula))q3 group by cedula \
    ) q1 on q1.cedula=c.cedula \
    where c.cedula=$1 \
    group by c.nombre,q1.adquiridas"
    sesiones = await pool.query(query,[cedula])

      let htmlRow = ""
      let htmlRow2= ""
      ventas.rows.forEach(venta =>{
        htmlRow+='<tr><td style="border:1px solid black">'+cuenta.rows[0].nombre+'</td>'
        htmlRow+='<td style="border:1px solid black">'+venta.fecha+'</td>'
        htmlRow+='<td style="border:1px solid black">$'+venta.valor+'</td></tr>'
      })
      abonos.rows.forEach(abono =>{
        htmlRow2+='<tr><td style="border:1px solid black">'+cuenta.rows[0].nombre+'</td>'
        htmlRow2+='<td style="border:1px solid black">'+abono.fecha+'</td>'
        htmlRow2+='<td style="border:1px solid black">$'+abono.valor
        +'</td></tr>'
      })

      let mailData = {
        from: "strengthclub@zohomail.com",
        to: cuenta.rows[0].email,
        subject: "Notificacion de Deudas",
        text : "Prueba",
        html: '<!doctype html> \
        <html ⚡4email> \
          <head> \
            <meta charset="utf-8"> \
            <style amp4email-boilerplate>body{visibility:hidden}</style> \
            <script async src="https://cdn.ampproject.org/v0.js"></script> \
            <script async custom-element="amp-anim" src="https://cdn.ampproject.org/v0/amp-anim-0.1.js"></script> \
          </head> \
          <body> \
          <h2>Estado de Cuenta Strength Club</h2> \
          <table style="width:100%; border:1px solid black"> \
            <tr> \
              Compras\
            </tr>\
            <tr> \
              <th style="border:1px solid black">Nombre</th> \
              <th style="border:1px solid black">Fecha</th> \
              <th style="border:1px solid black">Valor</th> \
            </tr>'+htmlRow+' \
            <tr> \
              Abonos\
            </tr>'+htmlRow2+'\
            <tr> \
              <th style="border:1px solid black"></th>\
              <th style="border:1px solid black">Total Deuda:</th>\
              <th style="border:1px solid black">$'+cuenta.rows[0]+'</th>\
            </tr> \
            <tr> \
              <th style="border:1px solid black"></th>\
              <th style="border:1px solid black">Total Abonos:</th>\
              <th style="border:1px solid black">$'+cuenta.rows[0]+'</th>\
            </tr> \
            <tr> \
              <th style="border:1px solid black"></th>\
              <th style="border:1px solid black">Total Saldo:</th>\
              <th style="border:1px solid black">$'+cuenta.rows[0]+'</th>\
            </tr> \
             <tr> \
                Sesiones \
             </tr> \
             <tr> \
              <th style="border:1px solid black"></th>\
              <th style="border:1px solid black">Sesiones Tomadas:</th>\
              <th style="border:1px solid black">$'+sesiones.rows[0].tomadas+'</th>\
            </tr> \
            <tr> \
              <th style="border:1px solid black"></th>\
              <th style="border:1px solid black">Sesiones Pagadas:</th>\
              <th style="border:1px solid black">$'+sesiones.rows[0].adquiridas+'</th>\
            </tr> \
            <tr> \
              <th style="border:1px solid black"></th>\
              <th style="border:1px solid black">Sesiones Restantes:</th>\
              <th style="border:1px solid black">$'+sesiones.rows[0].total+'</th>\
            </tr> \
          </table> \
          </body> \
        </html>'
        
      }
      transporter.sendMail(mailData, (error,info)=>{
        if(error){
          console.log(error)
          response.status(500)
          .send({
            message: error
          }); 
          return;
        }
        response.status(200).send({
          message:"Correo enviado exitosamente"
        })
        return;
      })
    } catch (error) {
      console.log(error)
      response.status(500)
      .send({
        message: error
      });
      return;
    }
  }

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

const postAbono = (request, response)=>{
  let cliente = request.body.cliente;
  let abono = request.body.abono;
  pool.query("INSERT INTO abonos(cliente,valor,fecha) VALUES ($1,$2,to_char(current_timestamp,'YYYY-MM-DD HH24:MI:SS'))",[cliente,abono],(error,results)=>{
    if (error) {
      response.status(500)
          .send({
            message: error
          });
      }else{
        response.status(200).send({abono:"Abono creado exitosamente"});
      }
  })
}

const getContabilidadClientes = (request,response) =>{
  let fechaInicio = request.body.fechaInicio
  let fechaFin = request.body.fechaFin
  let query=""
  if(fechaInicio&&fechaFin){
    query = "select c.cedula, c.nombre, c.email, cast(sum(v.valor) as money) as debito, cast(q2.valor as money) as abonos, cast(coalesce(q2.valor,0)-sum(v.valor) as money) as saldo from clientes c \
    left join ventas v on v.cliente = c.cedula \
    left join \
    (	select c2.cedula, sum(a.valor) as valor \
      from clientes c2 \
      inner join abonos a on c2.cedula=a.cliente \
      where to_timestamp( a.fecha ,'yyyy-mm-dd HH24:MI:SS') between to_timestamp($1 ,'yyyy-mm-dd') and to_timestamp( $2 ,'yyyy-mm-dd')\
      group by c2.cedula) as q2 on q2.cedula=c.cedula \
      where to_timestamp( v.fecha ,'yyyy-mm-dd HH24:MI:SS') between to_timestamp($1 ,'yyyy-mm-dd') and to_timestamp( $2 ,'yyyy-mm-dd')\
    group by c.cedula, c.nombre,c.email, q2.valor"
    pool.query(query,[fechaInicio,fechaFin],(error,results)=>{
      if (error) {
        response.status(500)
            .send({
              message: error
            });
        }else{
          response.status(200).send({clientes:results.rows});
        }
    })
  }else{
    query = "select c.cedula, c.nombre, c.email, cast(sum(v.valor) as money) as debito, cast(q2.valor as money) as abonos, cast(q2.valor-sum(v.valor) as money) as saldo from clientes c \
    left join ventas v on v.cliente = c.cedula \
    left join \
    (	select c2.cedula, sum(a.valor) as valor \
      from clientes c2 \
      inner join abonos a on c2.cedula=a.cliente \
      group by c2.cedula) as q2 on q2.cedula=c.cedula \
    group by c.cedula, c.nombre,c.email, q2.valor"
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
}

const crearCliente = (request, response) =>{
    let nombre = request.body.nombre;
    let email = request.body.email;
    let direccion = request.body.direccion;
    let telefono = request.body.telefono;
    let cedula = request.body.cedula;
    let nacimiento = request.body.fechaNacimiento;
    let anticipado = request.body.anticipado
    if(nombre && email && direccion && telefono && cedula && nacimiento){
        pool.query("INSERT INTO clientes(cedula,nombre,email,telefono,direccion,fecha_nacimiento,anticipado) VALUES($1,$2,$3,$4,$5,$6,$7)", [cedula, nombre, email,telefono,direccion,nacimiento,anticipado], (error, results)=>{
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
    let anticipado = request.body.anticipado
  if(nombre && email && direccion && telefono && cedula && nacimiento){
      pool.query("UPDATE clientes SET nombre=$1,email=$2,direccion=$3,telefono=$4,fecha_nacimiento=$5,anticipado=$7 WHERE cedula=$6", [nombre, email,direccion,telefono,nacimiento,cedula,anticipado], (error, results)=>{
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



module.exports = {crearCliente,getClientes,deleteClientes,updateCliente, getContabilidadClientes,postAbono,sendEmail,sendAllEmail}