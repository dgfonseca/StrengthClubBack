var jwt = require("jsonwebtoken");
var bcrypt = require("bcrypt");
const Pool = require("pg").Pool
require("dotenv").config();


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

    const getVentas = (request,response) =>{
        pool.query("select foo.id,foo.cliente,foo.nombre,foo.fecha,sum(foo.precio) as precio from \
        (select ve.id, ve.fecha, ve.cliente, cl.nombre, sum((vp.cantidad*pa.precio)) as precio  from ventas ve \
        inner join ventas_paquetes vp on vp.venta = ve.id \
        inner join paquetes pa on pa.codigo=vp.paquete \
        inner join clientes cl on cl.cedula=ve.cliente \
        group by ve.id, ve.fecha, ve.cliente, cl.nombre \
        union \
        select ve2.id, ve2.fecha, ve2.cliente, c.nombre, sum(vp2.cantidad*p.precio) as precio from ventas ve2 \
        inner join ventas_productos vp2 on ve2.id=vp2.venta \
        inner join productos p on p.codigo=vp2.producto \
        inner join clientes c on c.cedula=ve2.cliente \
        group by ve2.id, ve2.fecha, ve2.cliente, c.nombre) as foo group by foo.id,foo.fecha,foo.cliente,foo.nombre ORDER BY foo.fecha desc",(error,results)=>{
          if (error) {
            response.status(500)
                .send({
                  message: error
                });
            }else{
              response.status(200).send({ventas:results.rows});
            }
        })
      }

      const getContenidoVentas = (request,response) =>{
        let id = request.body.id
        pool.query("select foo.codigo, foo.nombre, foo.cantidad from \
        (select pa.codigo, pa.nombre, vp.cantidad  from ventas ve \
        inner join ventas_paquetes vp on vp.venta = ve.id \
        inner join paquetes pa on pa.codigo=vp.paquete \
        inner join clientes cl on cl.cedula=ve.cliente \
        where ve.id=$1 \
        group by pa.codigo, pa.nombre, vp.cantidad \
        union \
        select p.codigo, p.nombre, vp2.cantidad  from ventas ve2 \
        inner join ventas_productos vp2 on ve2.id=vp2.venta \
        inner join productos p on p.codigo=vp2.producto \
        inner join clientes c on c.cedula=ve2.cliente \
        where ve2.id=$2 \
        group by p.codigo, p.nombre, vp2.cantidad) as foo group by foo.codigo, foo.nombre, foo.cantidad",[id,id],(error,results)=>{
          if (error) {
            response.status(500)
                .send({
                  message: error
                });
            }else{
              response.status(200).send({contenido:results.rows});
            }
        })
      }

const registrarVentaProductos = async (request, response) => {
    const client = await pool.connect();
    let cliente = request.body.cliente;
    let productos = request.body.productos;
    let paquetes = request.body.paquetes;
    try{
        await client.query('BEGIN')
        let res= await  client.query("INSERT INTO ventas(cliente,fecha) VALUES ($1,to_char(current_timestamp,'YYYY-MM-DD HH24:MI')) RETURNING id",[cliente]);
        let venta = res.rows[0].id
        let errors = []
        if(productos){
            for (let element of productos) {
                let codigo = element.codigo;
                let cantidad = element.cantidad;
                let rescount = await client.query("SELECT count(*) FROM productos WHERE codigo=$1 AND inventario>=$2",[codigo,cantidad])
                if(rescount.rows[0].count<=0){
                    errors.push({
                        codigo:codigo,
                        inventario:cantidad
                    })
                }else{
                    await client.query("UPDATE productos SET inventario=inventario-$1 WHERE codigo=$2",[cantidad,codigo])
                    await client.query("INSERT INTO ventas_productos(venta,producto,cantidad) values ($1,$2,$3)",[venta,element.codigo,element.cantidad])
                }
            }
        }
        if(paquetes){
            for(element of paquetes){
                let codigo = element.codigo
                let cantidad = element.cantidad
                let rescount = await client.query("SELECT COUNT(*) FROM paquetes AS paq INNER JOIN productos_paquete AS pp ON paq.codigo=pp.codigo_paquete INNER JOIN productos AS pro ON pp.codigo_producto=pro.codigo WHERE pro.inventario>=pp.cantidad*$1 AND paq.codigo=$2",[cantidad,codigo])
                let prodcount = await client.query("SELECT COUNT(*) FROM paquetes AS paq INNER JOIN productos_paquete AS pp ON paq.codigo=pp.codigo_paquete INNER JOIN productos AS pro ON pp.codigo_producto=pro.codigo WHERE paq.codigo=$1",[codigo])
                if(rescount.rows[0].count<=0||rescount.rows[0].count<prodcount.rows[0].count){
                    errors.push({
                        codigo:codigo,
                        inventario:cantidad
                    })
                }else{
                    await client.query("INSERT INTO ventas_paquetes(venta,paquete,cantidad) values ($1,$2,$3)",[venta,element.codigo,element.cantidad])
                    await client.query("UPDATE productos as prod SET inventario=inventario-pp.cantidad*$1 FROM paquetes AS paq INNER JOIN productos_paquete AS pp ON paq.codigo=pp.codigo_paquete WHERE paq.codigo=$2 AND prod.codigo=pp.codigo_producto",[cantidad,codigo])
                }
            }
        }
        if(errors.length==0){
            await  client.query("COMMIT")
            response.status(200).send({
                message:"Venta registrada correctamente"
            });
        }else{
            await client.query('ROLLBACK')
            let codigos="";
            errors.forEach(element => {
                console.log(element.codigo)
                codigos = codigos.concat(element.codigo+",")
            });
            response.status(400).send({
                message:"Error al registrar venta, los siguientes codigos de producto o paquete no poseen la cantidad suficiente de inventario: "+codigos
            });
        }

    }
    catch (e) {
        await client.query('ROLLBACK')
        response.status(400).send({
            message:"Error al crear registrar venta"
        });
        throw e
    }
    finally {
        client.release()
    }
};

module.exports = {registrarVentaProductos, getContenidoVentas, getVentas}