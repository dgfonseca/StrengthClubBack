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
    let fechaFin = request.boy.fechaFin;

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
            (select count(*) as total from sesiones and to_timestamp( fecha ,'yyyy-mm-dd HH24:MI:SS') between to_timestamp($1 ,'yyyy-mm-dd') and to_timestamp( $2 ,'yyyy-mm-dd'))"
        }

        let res = client.query(query,range===true?[fechaInicio,fechaFin]:[]);
        response.status(200).send({sesiones:res.rows})
    } catch (error) {
        response.status(500).send({abonos:error});
        return;
        
    }
}


function validateNull(param){
    if(param === '' || param === null || param ===undefined){
        return false
    }
    return true;
}

module.exports = {contabilidadSesiones}