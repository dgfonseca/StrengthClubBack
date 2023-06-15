const Pool = require("pg").Pool

const pool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
    ssl: false
    });



const contabilidadSesiones = async (request, response) =>{

    let fechaInicio =  request.body.fechaInicio;
    let fechaFin = request.body.fechaFin;

    try {
        const client = await pool.connect();
        let range = false

        let query = "select \
        (select count(*) as asistio from sesiones where asistio = true) as asistio,  \
        (select count(*) as noasistio from sesiones where asistio = false), \
        (select count(*) as virtual from sesiones where virtual = true), \
        (select count(*) as novirtual from sesiones where virtual = false), \
        (select count(*) as total from sesiones)"
        if(validateNull(fechaInicio) && validateNull(fechaFin)){
            range=true
            query = "select \
            (select count(*) as asistio from sesiones where asistio = true and to_timestamp( fecha ,'yyyy-mm-dd HH24:MI:SS') between to_timestamp($1 ,'yyyy-mm-dd') and to_timestamp( $2 ,'yyyy-mm-dd')), \
            (select count(*) as noasistio from sesiones where asistio = false and to_timestamp( fecha ,'yyyy-mm-dd HH24:MI:SS') between to_timestamp($1 ,'yyyy-mm-dd') and to_timestamp( $2 ,'yyyy-mm-dd')), \
            (select count(*) as virtual from sesiones where virtual = true and to_timestamp( fecha ,'yyyy-mm-dd HH24:MI:SS') between to_timestamp($1 ,'yyyy-mm-dd') and to_timestamp( $2 ,'yyyy-mm-dd')), \
            (select count(*) as novirtual from sesiones where virtual = false and to_timestamp( fecha ,'yyyy-mm-dd HH24:MI:SS') between to_timestamp($1 ,'yyyy-mm-dd') and to_timestamp( $2 ,'yyyy-mm-dd')), \
            (select count(*) as total from sesiones where to_timestamp( fecha ,'yyyy-mm-dd HH24:MI:SS') between to_timestamp($1 ,'yyyy-mm-dd') and to_timestamp( $2 ,'yyyy-mm-dd'))"
        }

        let res = await client.query(query,range===true?[fechaInicio,fechaFin]:[]);
        response.status(200).send({sesiones:res.rows})
    } catch (error) {
        response.status(500).send({abonos:error});
        return;
        
    }
}

const getContabilidadDeudores = async (request,response)=>{
    let fechaInicio =  request.body.fechaInicio;
    let fechaFin = request.body.fechaFin;
    try {
        const client = await pool.connect();
        let range = false
        let query = "select * from \
        ( \
            select c.cedula, c.nombre, c.email, cast(sum(coalesce(v.valor,0)) as money) as debito, cast(coalesce(q2.valor,0) as money) as abonos, cast(sum(coalesce(v.valor,0))-coalesce(q2.valor,0) as money) as saldo, c.anticipado from clientes c \
            left join ventas v on v.cliente = c.cedula \
            left join ( \
                select c2.cedula, sum(a.valor) as valor \
                  from clientes c2 \
                  inner join abonos a on c2.cedula=a.cliente \
                  group by c2.cedula) as q2 \
            on q2.cedula=c.cedula \
            group by c.cedula, c.nombre,c.email, q2.valor ) q1 \
         where cast(q1.saldo as numeric) > 0"
        let query2="select q1.sesv+q1.sesp-q1.sest as deuda \
        from (select (select coalesce(sum(vp.cantidad),0) as sesiones \
                  from ventas v \
                  inner join ventas_productos vp on vp.venta = v.id \
                  where vp.producto='SES' and v.cliente=$1) as sesv, \
              (select coalesce(sum(pp.cantidad*vp.cantidad),0) as sesiones from ventas v \
                  inner join ventas_paquetes vp on vp.venta = v.id \
                  inner join productos_paquete pp on pp.codigo_paquete = vp.paquete where v.cliente=$1 and pp.codigo_producto ='SES') as sesp, \
              (select count(*) as sesiones from sesiones s where s.cliente=$1) as sest) as q1"
         if(validateNull(fechaInicio) && validateNull(fechaFin)){
            range=true;
            query="select * from \
            ( \
                select c.cedula, c.nombre, c.email, cast(sum(coalesce(v.valor,0)) as money) as debito, cast(coalesce(q2.valor,0) as money) as abonos, cast(sum(coalesce(v.valor,0))-coalesce(q2.valor,0) as money) as saldo, c.anticipado from clientes c \
                left join ventas v on v.cliente = c.cedula \
                left join ( \
                    select c2.cedula, sum(a.valor) as valor \
                      from clientes c2 \
                      inner join abonos a on c2.cedula=a.cliente \
                      where to_timestamp( a.fecha ,'yyyy-mm-dd HH24:MI:SS') between to_timestamp($1 ,'yyyy-mm-dd') and to_timestamp( $2 ,'yyyy-mm-dd') \
                      group by c2.cedula) as q2 \
                on q2.cedula=c.cedula \
                where to_timestamp( v.fecha ,'yyyy-mm-dd HH24:MI:SS') between to_timestamp($1 ,'yyyy-mm-dd') and to_timestamp( $2 ,'yyyy-mm-dd') \
                group by c.cedula, c.nombre,c.email, q2.valor ) q1 \
             where cast(q1.saldo as numeric) > 0"
             query2="select q1.sesv+q1.sesp-q1.sest as deuda \
             from (select (select coalesce(sum(vp.cantidad),0) as sesiones \
                       from ventas v \
                       inner join ventas_productos vp on vp.venta = v.id \
                       where vp.producto='SES' and v.cliente=$1 \
                       and to_timestamp( v.fecha ,'yyyy-mm-dd HH24:MI:SS') between to_timestamp($2 ,'yyyy-mm-dd') and to_timestamp( $3 ,'yyyy-mm-dd')) as sesv, \
                   (select coalesce(sum(pp.cantidad*vp.cantidad),0) as sesiones from ventas v \
                       inner join ventas_paquetes vp on vp.venta = v.id \
                       inner join productos_paquete pp on pp.codigo_paquete = vp.paquete where v.cliente=$1 \
                       and pp.codigo_producto ='SES' and to_timestamp( v.fecha ,'yyyy-mm-dd HH24:MI:SS') between to_timestamp($2 ,'yyyy-mm-dd') and to_timestamp( $3 ,'yyyy-mm-dd')) as sesp, \
                   (select count(*) as sesiones from sesiones s where s.cliente=$1 \
                        and to_timestamp( s.fecha ,'yyyy-mm-dd HH24:MI:SS') between to_timestamp($2 ,'yyyy-mm-dd') and to_timestamp( $3 ,'yyyy-mm-dd')) as sest) as q1"
         }

         let res = await client.query(query,range===true?[fechaInicio,fechaFin]:[]);
         for(const element of res.rows) {
            console.log(element.anticipado)
            if(element.anticipado){
                
                let ses = await client.query(query2,range===true?[element.cedula,fechaInicio,fechaFin]:[element.cedula])
                element["sesiones"]=res.rows[0].deuda
            }else{
                element["sesiones"]="N/A"
            }            
         }

        response.status(200).send({contabilidad:res.rows})
        
    } catch (error) {
        console.log(error)
        response.status(500).send({contabilidad:error});
        return;
    }


}


function validateNull(param){
    if(param === '' || param === null || param ===undefined){
        return false
    }
    return true;
}

module.exports = {contabilidadSesiones,getContabilidadDeudores}