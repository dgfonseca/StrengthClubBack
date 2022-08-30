var jwt = require("jsonwebtoken");
var bcrypt = require("bcrypt");
const Pool = require("pg").Pool
const nodemailer = require('nodemailer');
const util = require('util');


const transporter = nodemailer.createTransport({
  port: 465,
  host: "smtp.zoho.com",
     auth: {
          user: 'strengthclub@zohomail.com',
          pass: 'Dark.orbit99',
       },
  secure: true,
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
          console.log(venta)
          htmlRow+='<tr><td style="border:1px solid black">'+cliente.nombre+'</td>'
          htmlRow+='<td style="border:1px solid black">'+venta.fecha+'</td>'
          htmlRow+='<td style="border:1px solid black">'+venta.valor+'</td></tr>'
        })
        console.log("nombre: "+htmlNombre)
        console.log("fecha: "+htmlFecha)
        console.log("valor: "+htmlValor)
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
            <h2>TH elements define table headers</h2> \
            <table style="width:100%; border:1px solid black"> \
              <tr> \
                <th style="border:1px solid black">Nombre</th> \
                <th style="border:1px solid black">Fecha</th> \
                <th style="border:1px solid black">Precio</th> \
              </tr>'+htmlRow+' \
            </table> \
            </body> \
          </html>'
          
        }
        console.log("Enviando")
        errores = await sendEmailPromise(mailData,errores,cliente);
      });
      console.log("Finaliza for")
      if(errores.length>0){
        response.status(200)
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
    let query = "select c.cedula, c.nombre, c.email, sum(v.valor) as debito, q2.valor as abonos, q2.valor-sum(v.valor) as saldo from clientes c \
    left join ventas v on v.cliente = c.cedula \
    left join \
    (	select c2.cedula, sum(a.valor) as valor \
      from clientes c2 \
      inner join abonos a on c2.cedula=a.cliente \
      group by c2.cedula) as q2 on q2.cedula=c.cedula \
      where c.cedula=$1 \
    group by c.cedula, c.nombre,c.email, q2.valor"
    try {
      let cuenta = await pool.query(query,[cedula]);
      let cliente = cuenta.rows[0];
      let mailData = {
        from: "strengthclub@zohomail.com",
        to: cliente.email,
        subject: "Prueba",
        text : "Prueba",
        html: ""
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
  let query = "select c.cedula, c.nombre, c.email, sum(v.valor) as debito, q2.valor as abonos, q2.valor-sum(v.valor) as saldo from clientes c \
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



module.exports = {crearCliente,getClientes,deleteClientes,updateCliente, getContabilidadClientes,postAbono,sendEmail,sendAllEmail}