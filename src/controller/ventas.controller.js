const Pool = require("pg").Pool
require("dotenv").config();


const pool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
    ssl: false

    });

    const getVentasCliente = (request,response) =>{
        let cliente = request.body.cliente;
        pool.query("SELECT *, cast(ROUND(valor) as money) as valor FROM ventas WHERE cliente=$1 AND TO_TIMESTAMP(fecha,'YYYY-MM-DD') >= date_trunc('month',current_date) ORDER BY fecha desc",[cliente],(error,results)=>{
          if (error) {
            console.log(error)
            response.status(500)
                .send({
                  message: error
                });
            }else{
              response.status(200).send({ventas:results.rows});
            }
        })
      }

    const getVentas = (request,response) =>{
        pool.query("select v.id,c.cedula,c.nombre,v.fecha,cast(round(v.valor) as money) as valor,v.usuario \
        from ventas v inner join clientes c on c.cedula =v.cliente \
        order by v.fecha desc",(error,results)=>{
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


      const eliminarVenta = async (request, response)=>{
        const client = await pool.connect();
        let id = request.body.id
        try {
            await client.query("BEGIN");
            const logInfo = await client.query("select * from ventas where id=$1",[id]);
            console.log("Se borra la venta del cliente "+logInfo.rows[0].cliente + " con valor de "+logInfo.rows[0].valor +" con fecha "+ logInfo.rows[0].fecha)
            const prods = await client.query("select foo.codigo, foo.nombre, foo.cantidad from \
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
                    group by p.codigo, p.nombre, vp2.cantidad) as foo group by foo.codigo, foo.nombre, foo.cantidad",[id,id])
                    prods.rows.forEach(async contenido => {
                        let codigo = contenido.codigo
                        let cantidad = contenido.cantidad
                        await client.query("UPDATE productos SET inventario=inventario+$1 WHERE codigo=$2",[cantidad,codigo]);
                        const rowCount = await client.query("SELECT count(*) from paquetes WHERE codigo=$1", [codigo]);
                        if(rowCount.rows[0].count>0){
                            const resPP=await client.query("SELECT pr.codigo,pp.cantidad FROM paquetes pa INNER JOIN productos_paquete pp on pp.codigo_paquete=pa.codigo INNER JOIN productos pr on pr.codigo=pp.codigo_producto WHERE pa.codigo=$1",[codigo])
                            for(producto of resPP.rows){
                                let inv = producto.cantidad*cantidad
                                await client.query("UPDATE productos SET inventario=inventario+$1 WHERE codigo=$2",[inv,producto.codigo])
                            }
                        }
                    });
            await client.query("DELETE FROM ventas WHERE id=$1",[id]);
            await client.query("COMMIT");
            response.status(200).send({message:"Venta borrada exitosamente"});
            return;
        } catch (error) {
            await client.query("ROLLBACK");
            response.status(400).send({message:"Mo se puede borrar la venta "+error});
            return;
        }
      }
const registrarVentaProductos = async (request, response) => {
    request.connection.setTimeout( 1000 * 30 );
    const client = await pool.connect();
    let cliente = request.body.cliente;
    let productos = request.body.productos;
    let paquetes = request.body.paquetes;
    let valor = request.body.valor;
    let usuario = request.tokenData;
    let fecha = request.body.fecha;
    let esSesiones = false;
    try{
        await client.query('BEGIN')
        let res;
        if(fecha){
            res= await client.query("INSERT INTO ventas(cliente,fecha,valor,usuario) VALUES ($1,$2,$3,$4) RETURNING id",[cliente,fecha,valor,usuario]);
        }else{
            res= await client.query("INSERT INTO ventas(cliente,fecha,valor,usuario) VALUES ($1,to_char(current_timestamp at time zone 'America/Bogota','YYYY-MM-DD HH24:MI:SS'),$2,$3) RETURNING id",[cliente,valor,usuario]);
        }
        let venta = res.rows[0].id
        let errors = []
        if(productos){
            for (let element of productos) {
                let codigo = element.codigo;
                if(codigo==='SES'||codigo.includes("VAL")){esSesiones=true}
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
                if(codigo.includes('SES')|| codigo.includes('VAL')){
                    esSesiones=true;
                }
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
                message:"Venta registrada correctamente",
                esSesiones:esSesiones
            });
        }else{
            await client.query('ROLLBACK')
            let codigos="";
            errors.forEach(element => {
                codigos = codigos.concat(element.codigo+",")
            });
            response.status(400).send({
                message:"Error al registrar venta, los siguientes codigos de producto o paquete no poseen la cantidad suficiente de inventario: "+codigos
            });
        }

    }
    catch (e) {
        console.log(e)
        await client.query('ROLLBACK')
        response.status(400).send({
            message:"Error al crear registrar venta",
            error:e
        });
        throw e
    }
    finally {
        client.release()
    }
};

module.exports = {registrarVentaProductos, getContenidoVentas, getVentas, eliminarVenta, getVentasCliente}