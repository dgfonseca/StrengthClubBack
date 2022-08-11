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
    let habilitado = request.body.habilitado;
    let precioCompra = request.body.precioCompra;
    if(nombre && codigo && descripcion && inventario && precio && precioCompra){
        pool.query("INSERT INTO productos(nombre,codigo,descripcion,inventario,precio,habilitado,precioCompra) VALUES($1,$2,$3,$4,$5,$6,$7)", [nombre, codigo, descripcion,inventario,precio,habilitado,precioCompra], (error, results)=>{
            if (error) {
              response.status(500)
                  .send({
                    message: error
                  });
              }
            else {
              pool.query("INSERT INTO historico_productos(producto,inventario,precioCompra,precio,fechaInicio,fechaFin) VALUES($1,$2,$3,$4, TO_CHAR(NOW() :: DATE, 'yyyy/mm/dd'),null)", [codigo, inventario,precioCompra,precio], (error, results)=>{
                if (error) {
                  response.status(500)
                      .send({
                        message: error
                      });
                  }else{
                    response.status(200).send({message:"Producto Creado Exitosamente"});
                  }
              })
            }
        });
    }else{
      response.status(400).json({message:"Campos Faltantes"});
    }
};

const updateProducto = (request, response) =>{
  let nombre = request.body.nombre;
  let codigo = request.body.codigo;
  let descripcion = request.body.descripcion;
  let inventario = request.body.inventario;
  let precio = request.body.precio;
  let habilitado = request.body.habilitado
  if(nombre && codigo && descripcion && inventario && precio){
      pool.query("UPDATE productos SET nombre=$1,descripcion=$2,inventario=$3,precio=$4,habilitado=$5 WHERE codigo=$6", [nombre, descripcion,inventario,precio,habilitado,codigo], (error, results)=>{
          if (error) {
            response.status(500)
                .send({
                  message: error
                });
            }
          else {
            response.status(200).send({message:"Producto Actualizado Exitosamente"});
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

const getProductosHabilitados = (request,response) =>{
  pool.query("SELECT * FROM productos WHERE habilitado=true",(error,results)=>{
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

const deleteProductos = (request,response) =>{
  let codigo = request.body.codigo;
  if(codigo){
    pool.query("DELETE FROM productos WHERE codigo=$1",[codigo],(error,results)=>{
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

module.exports = {crearProducto,getProductos, updateProducto,getProductosHabilitados,deleteProductos}