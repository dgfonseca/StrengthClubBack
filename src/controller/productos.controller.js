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

const crearProducto = (request, response) =>{
    let nombre = request.body.nombre;
    let codigo = request.body.codigo;
    let descripcion = request.body.descripcion;
    let inventario = request.body.inventario;
    let precio = request.body.precio;
    if(nombre && codigo && descripcion && inventario && precio){
        pool.query("INSERT INTO productos(nombre,codigo,descripcion,inventario,precio) VALUES($1,$2,$3,$4,$5)", [nombre, codigo, descripcion,inventario,precio], (error, results)=>{
            if (error) {
              response.status(500)
                  .send({
                    message: error
                  });
              }
            else {
              response.status(200).send({message:"Producto Creado Exitosamente"});
            }
        });
    }else{
      response.status(400).json({message:"Campos Faltantes"});
    }
};

const getProductos = (request,response) =>{
  pool.query("SELECT * FROM productos",(error,results)=>{
    if (error) {
      response.status(500)
          .send({
            message: error
          });
      }else{
        response.status(200).send({productos:results.rows});
      }
  })
}



module.exports = {crearProducto,getProductos}