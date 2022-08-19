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
              pool.query("INSERT INTO historico_productos(producto,inventario,precioCompra,precio,fechaInicio,fechaFin) VALUES($1,$2,$3,$4, TO_CHAR(NOW(), 'yyyy/mm/dd HH24:MI:SS'),null)", [codigo, inventario,precioCompra,precio], (error, results)=>{
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


const updateProducto = async (request, response) =>{
  let nombre = request.body.nombre;
  let codigo = request.body.codigo;
  let descripcion = request.body.descripcion;
  let inventario = request.body.inventario;
  let precio = request.body.precio;
  let habilitado = request.body.habilitado;
  let precioCompra = request.body.precioCompra;
  let inventarioAdicional = request.body.inventarioAdicional;
  const client = await pool.connect();
try {
  await client.query("BEGIN");
  if(nombre && codigo && descripcion && inventario && precio){
      if(inventarioAdicional && inventarioAdicional!==0){
        await client.query("UPDATE productos SET nombre=$1,descripcion=$2,inventario=inventario+$3,precio=$4,habilitado=$5 WHERE codigo=$6", [nombre, descripcion,inventarioAdicional,precio,habilitado,codigo]);
        await client.query("UPDATE historico_productos SET fechaFin=TO_CHAR(NOW(), 'yyyy/mm/dd HH12:MI:SS') WHERE producto=$1 and fechaFin is null",[codigo]);
        await client.query("INSERT INTO historico_productos(producto,inventario,precioCompra,precio,fechaInicio,fechaFin) VALUES($1,$2,$3,$4, TO_CHAR(NOW(), 'yyyy/mm/dd HH24:MI:SS'),null)", [codigo, inventarioAdicional,precioCompra,precio])
      }else{
        await client.query("UPDATE productos SET nombre=$1,descripcion=$2,inventario=$3,precio=$4,habilitado=$5 WHERE codigo=$6", [nombre, descripcion,inventario,precio,habilitado,codigo]);
        await client.query("UPDATE historico_productos SET fechaFin=TO_CHAR(NOW(), 'yyyy/mm/dd HH12:MI:SS') WHERE codigo=$1 and fechaFin is null",[codigo]);
        await client.query("INSERT INTO historico_productos(producto,inventario,precioCompra,precio,fechaInicio,fechaFin) VALUES($1,$2,$3,$4, TO_CHAR(NOW(), 'yyyy/mm/dd HH24:MI:SS'),null)", [codigo, inventario,precioCompra,precio])
      }
      await client.query("COMMIT");
      response.status(200).send({message:"Producto Actualizado Exitosamente"});
  }else{

    await client.query("ROLLBACK");
  }
  return;
} catch (error) {
  await client.query("ROLLBACK");
  response.status(500).json({message:error});
  return;
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

const getContabilidadProductos = (request,response) =>{
  pool.query("select q2.nombre,q2.codigo,q2.inventario,q2.precio,q2.preciocompra,coalesce(q3.unidadesvendidas,0),coalesce(round(sum(q1.ingresos),2),0) as ingresos, coalesce(round(q2.egresos,2),0), coalesce(sum(q1.ingresos)-q2.egresos,0) as utilidad \
  from( \
    select codigo, ingresos \
    from \
      (select p.codigo,sum(p.ingreso) as ingresos \
        from( \
          select p.codigo ,hp.precio*vp.cantidad as ingreso, v.id  from productos p \
          inner join ventas_productos vp on p.codigo = vp.producto \
          inner join ventas v on v.id = vp.venta \
          inner join historico_productos hp on p.codigo = hp.producto \
          and to_timestamp( v.fecha ,'yyyy-mm-dd HH24:MI:SS') between to_timestamp( hp.fechainicio ,'yyyy/mm/dd HH24:MI:SS') \
          and to_timestamp(coalesce(hp.fechafin, to_char(now(),'yyyy/mm/dd HH24:MI:SS')),'yyyy/mm/dd HH24:MI:SS')  \
          group by p.codigo,hp.precio,vp.cantidad,v.id  \
           ) as p group by p.codigo) as q1 \
    union \
      (select p2.codigo ,sum(q1.descuento*vp.cantidad*pp.cantidad*hp.precio)  \
      from ventas v \
      inner join ventas_paquetes vp on v.id =vp.venta \
      inner join paquetes p on vp.paquete=p.codigo  \
      inner join productos_paquete pp on pp.codigo_paquete  = p.codigo \
      inner join historico_productos hp on hp.producto = pp.codigo_producto \
      inner join ( \
        SELECT  v.id ,pa.codigo, pa.precio/sum(pp.cantidad*hp.precio) as descuento FROM paquetes pa \
        INNER JOIN productos_paquete pp on pa.codigo=pp.codigo_paquete  \
        inner join ventas_paquetes vp on vp.paquete = pa.codigo \
        inner join ventas v on v.id = vp.venta \
        INNER JOIN historico_productos hp on hp.producto=pp.codigo_producto  \
        and to_timestamp( v.fecha ,'yyyy-mm-dd HH24:MI:SS') between to_timestamp( hp.fechainicio ,'yyyy/mm/dd HH24:MI:SS')  \
        and to_timestamp(coalesce(hp.fechafin, to_char(now(),'yyyy/mm/dd HH24:MI:SS')),'yyyy/mm/dd HH24:MI:SS') \
        group by pa.codigo,v.id \
      ) as q1	on q1.codigo=p.codigo and q1.id=v.id \
      inner join productos p2 on pp.codigo_producto = p2.codigo \
      and to_timestamp( v.fecha ,'yyyy-mm-dd HH24:MI:SS') between to_timestamp( hp.fechainicio ,'yyyy/mm/dd HH24:MI:SS') \
      and to_timestamp(coalesce(hp.fechafin, to_char(now(),'yyyy/mm/dd HH24:MI:SS')),'yyyy/mm/dd HH24:MI:SS') group by p2.codigo \
      ) \
    ) q1 \
  right join ( \
    select p.nombre,p.inventario,p.precio,p.preciocompra,p.codigo,sum(hp.preciocompra*hp.inventario) as egresos from historico_productos hp \
    inner join productos p on p.codigo = hp.producto group by p.nombre,p.codigo,p.inventario,p.precio,p.preciocompra \
  ) q2 on q1.codigo=q2.codigo \
  left join ( \
    select pp1.producto, sum(pp1.cantidad) as unidadesvendidas \
    from ( \
      select producto as producto,sum(cantidad) as cantidad \
      from ventas_productos vp group by producto \
     union \
       select pp.codigo_producto as producto, sum(vp.cantidad*pp.cantidad) as cantidad \
       from ventas_paquetes vp  \
       inner join productos_paquete pp on vp.paquete=pp.codigo_paquete  \
     group by pp.codigo_producto \
    ) as PP1 group by pp1.producto \
  ) q3 on q3.producto=q2.codigo \
  group by q2.nombre,q2.inventario,q2.precio,q2.preciocompra,q2.codigo,q2.egresos, q3.unidadesvendidas",(error,results)=>{
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

module.exports = {crearProducto,getProductos, updateProducto,getProductosHabilitados,deleteProductos, getContabilidadProductos}