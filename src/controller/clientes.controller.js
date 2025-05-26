const Pool = require("pg").Pool
const nodemailer = require('nodemailer');
const mimemessage = require('mimemessage');
const Imap =require('node-imap');


var imap = new Imap({
  user: process.env.MAIL_ACCOUNT,
  password: process.env.MAIL_PASSWORD,
  host: process.env.IMAP_MAIL_HOST,
  port: process.env.IMAP_MAIL_PORT,
  tls: true
})
const transporter = nodemailer.createTransport({
  port: process.env.MAIL_PORT,
  host: process.env.MAIL_HOST,
  secureConnection: false,
  
  auth: {
    user: process.env.MAIL_ACCOUNT,
    pass: process.env.MAIL_PASSWORD,
  }
});

const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
  ssl: false
  });



 

  const sendEmail = async (request,response)=>{
    let cedula = request.body.cedula;
    console.log("Enviando correo a " +cedula)
    let fechaInicio = request.body.fechaInicio;
    let fechaFin = request.body.fechaFin;
    let cuenta;let ventas;
    let abonos;
    let abonosValue;
    let abonosAnteriorValue;
    let sesionesTomadas;
    let sesionesVentasProductos;
    let sesionesVentasPaquetes;
    let sesionesVentasProductosMes;
    let sesionesVentasPaquetesMes;
    let deuda;
    let deudaAnterior;
    let sesion,suplementos,proteinas;
    try {
      sesion = await pool.query("select round(precio) as precio from productos where codigo='SES'");
      sesionVirtual = await pool.query("select round(precio) as precio from productos where codigo='SESV'");
      cuenta = await pool.query("select nombre,email ,anticipado, habilitado, round(precio_sesion) as precio_sesion from clientes where cedula=$1",[cedula]);
      sesionesTomadas = await pool.query("select count(*) as sesiones from sesiones s where s.cliente=$1 and virtual=false \
       and (fecha < date_trunc('month', current_timestamp at time zone 'America/Bogota')) \
       and (fecha >= date_trunc('month', current_timestamp at time zone 'America/Bogota' - interval '1' month))",[cedula])
      let totalSesionesTomadas = await pool.query("select count(*) as sesiones from sesiones s where s.cliente=$1 and virtual=false \
       and (fecha < date_trunc('month', current_timestamp at time zone 'America/Bogota'))",[cedula])
      let totalSesionesTomadasSaldoAnterior = await pool.query("select count(*) as sesiones from sesiones s where s.cliente=$1 and virtual=false \
       and (fecha < date_trunc('month', current_timestamp at time zone 'America/Bogota') - INTERVAL '1 months')",[cedula])
      sesionesVirtualesTomadas = await pool.query("select count(*) as sesiones from sesiones s where s.cliente=$1 and virtual=true \
       and (fecha < date_trunc('month', current_timestamp at time zone 'America/Bogota'))\
       and (fecha >= date_trunc('month', current_timestamp at time zone 'America/Bogota' - interval '1' month))",[cedula])
      let totalSesionesVirtualesTomadas = await pool.query("select count(*) as sesiones from sesiones s where s.cliente=$1 and virtual=true \
       and (fecha < date_trunc('month', current_timestamp at time zone 'America/Bogota'))",[cedula])
      let totalSesionesVirtualesTomadasSaldoAnterior = await pool.query("select count(*) as sesiones from sesiones s where s.cliente=$1 and virtual=true \
       and (fecha < date_trunc('month', current_timestamp at time zone 'America/Bogota'- INTERVAL '1' month) )",[cedula])
       sesionesVentasProductos = await pool.query("select coalesce(sum(vp.cantidad),0) as sesiones from ventas v \
      inner join ventas_productos vp on vp.venta = v.id \
      where vp.producto like '%SES%' and v.cliente=$1  \
       and (to_timestamp(v.fecha,'yyyy-mm-dd HH24:MI:SS') < date_trunc('month', current_timestamp at time zone 'America/Bogota'))",[cedula])
       sesionesVentasPaquetes = await pool.query("select coalesce(sum(pp.cantidad*vp.cantidad),0) as sesiones from ventas v \
      inner join ventas_paquetes vp on vp.venta = v.id \
      inner join productos_paquete pp on pp.codigo_paquete = vp.paquete where v.cliente=$1 and pp.codigo_producto like '%SES%' \
       and (to_timestamp(v.fecha,'yyyy-mm-dd HH24:MI:SS') < date_trunc('month', current_timestamp at time zone 'America/Bogota'))",[cedula])
       let sesionesVentasProductosSaldoAnterior = await pool.query("select coalesce(sum(vp.cantidad),0) as sesiones from ventas v \
      inner join ventas_productos vp on vp.venta = v.id \
      where vp.producto like '%SES%' and v.cliente=$1  \
       and (to_timestamp(v.fecha,'yyyy-mm-dd HH24:MI:SS') < date_trunc('month', current_timestamp at time zone 'America/Bogota' - INTERVAL '1' month))",[cedula])
       let sesionesVentasPaquetesSaldoAnterior = await pool.query("select coalesce(sum(pp.cantidad*vp.cantidad),0) as sesiones from ventas v \
      inner join ventas_paquetes vp on vp.venta = v.id \
      inner join productos_paquete pp on pp.codigo_paquete = vp.paquete where v.cliente=$1 and pp.codigo_producto like '%SES%' \
       and (to_timestamp(v.fecha,'yyyy-mm-dd HH24:MI:SS') < date_trunc('month', current_timestamp at time zone 'America/Bogota' - INTERVAL '1' month))",[cedula])
       sesionesVentasProductosMes = await pool.query("select coalesce(sum(vp.cantidad),0) as sesiones from ventas v \
      inner join ventas_productos vp on vp.venta = v.id \
      where vp.producto like '%SES%' and v.cliente=$1  \
       and (to_timestamp(v.fecha,'yyyy-mm-dd HH24:MI:SS') < date_trunc('month', current_timestamp at time zone 'America/Bogota')) \
       and (to_timestamp(fecha,'yyyy-mm-dd HH24:MI:SS') >= date_trunc('month', current_timestamp at time zone 'America/Bogota' - interval '1' month))",[cedula])
       sesionesVentasPaquetesMes = await pool.query("select coalesce(sum(pp.cantidad*vp.cantidad),0) as sesiones from ventas v \
      inner join ventas_paquetes vp on vp.venta = v.id \
      inner join productos_paquete pp on pp.codigo_paquete = vp.paquete where v.cliente=$1 and pp.codigo_producto like '%SES%' \
       and (to_timestamp(v.fecha,'yyyy-mm-dd HH24:MI:SS') < date_trunc('month', current_timestamp at time zone 'America/Bogota'))\
       and (to_timestamp(fecha,'yyyy-mm-dd HH24:MI:SS') >= date_trunc('month', current_timestamp at time zone 'America/Bogota' - interval '1' month))",[cedula])
       abonosValue = await pool.query("select coalesce(round(sum(valor)),0) as abonos from abonos a where a.cliente=$1  \
       and (to_timestamp(a.fecha,'yyyy-mm-dd HH24:MI:SS') < date_trunc('month', current_timestamp at time zone 'America/Bogota'))",[cedula])
       abonosAnteriorValue = await pool.query("select coalesce(round(sum(valor)),0) as abonos from abonos a where a.cliente=$1  \
       and (to_timestamp(a.fecha,'yyyy-mm-dd HH24:MI:SS') < date_trunc('month', current_timestamp at time zone 'America/Bogota' - interval '1' month))",[cedula])
       deuda = await pool.query("select c.cedula, round(sum(v.valor)) as debito from clientes c \
        left join ventas v on v.cliente = c.cedula  \
        where c.cedula=$1 and (to_timestamp(v.fecha,'yyyy-mm-dd HH24:MI:SS') < date_trunc('month', current_timestamp at time zone 'America/Bogota')) group by c.cedula",[cedula])
       deudaAnterior = await pool.query("select coalesce(round(sum(v.valor)),0) as debito from clientes c \
        left join ventas v on v.cliente = c.cedula  \
        where c.cedula=$1 and (to_timestamp(v.fecha,'yyyy-mm-dd HH24:MI:SS') < date_trunc('month', current_timestamp at time zone 'America/Bogota' - interval '1' month)) group by c.cedula",[cedula])
      abonos = await pool.query("select *, round(valor) as valor from abonos where cliente=$1 \
       and (to_timestamp(fecha,'yyyy-mm-dd HH24:MI:SS') < date_trunc('month', current_timestamp at time zone 'America/Bogota'))\
       and to_timestamp(fecha,'yyyy-mm-dd HH24:MI:SS') >= date_trunc('month', current_timestamp at time zone 'America/Bogota' - interval '1' month)",[cedula])
      proteinas = await pool.query("select q.codigo_paquete as nombre, count(distinct v.id)*vp.cantidad as cantidad,count(distinct v.id)*vp.cantidad*q.precio as precio from ventas v inner join ventas_paquetes vp on v.id = vp.venta \
      inner JOIN ( \
      	SELECT hp.codigo_paquete, hp.precio,TO_TIMESTAMP(hp.fechaInicio,'YYYY-MM-DD HH24:MI') as fechaInicio, coalesce(TO_TIMESTAMP(hp.fechafin,'YYYY-MM-DD HH24:MI'),current_timestamp at time zone 'America/Bogota') as fechaFin \
      	FROM historico_paquetes hp \
      ) q ON q.codigo_paquete=vp.paquete and \
      (TO_TIMESTAMP(v.fecha,'YYYY-MM-DD HH24:MI') > q.fechaInicio and TO_TIMESTAMP(v.fecha,'YYYY-MM-DD HH24:MI') < q.fechaFin) \
      where (to_timestamp(fecha,'yyyy-mm-dd HH24:MI:SS') < date_trunc('month', current_timestamp at time zone 'America/Bogota')) \
      and to_timestamp(fecha,'yyyy-mm-dd HH24:MI:SS') >= date_trunc('month', current_timestamp at time zone 'America/Bogota' - interval '1' month) and vp.paquete not like '%SES%' and v.cliente=$1 group by q.codigo_paquete,vp.cantidad,q.precio",[cedula])
      suplementos = await pool.query("select q.nombre, q.producto, count(distinct v.id)*q.precio*vp.cantidad as precio, count(distinct v.id)*vp.cantidad as cantidad from ventas v inner join \
      ventas_productos vp on v.id = vp.venta \
      inner join \
      ( \
      	select pr.nombre,p.producto,p.precio,TO_TIMESTAMP(p.fechaInicio,'YYYY-MM-DD HH24:MI') as fechaInicio, coalesce(TO_TIMESTAMP(p.fechafin,'YYYY-MM-DD HH24:MI'),current_timestamp at time zone 'America/Bogota') as fechaFin \
      	from historico_productos p INNER JOIN productos pr on pr.codigo=p.producto \
      ) \
      q on q.producto = vp.producto and \
      (TO_TIMESTAMP(v.fecha,'YYYY-MM-DD HH24:MI') > q.fechaInicio and TO_TIMESTAMP(v.fecha,'YYYY-MM-DD HH24:MI') < q.fechaFin) \
      where (to_timestamp(v.fecha,'yyyy-mm-dd HH24:MI:SS') < date_trunc('month', current_timestamp at time zone 'America/Bogota')) \
      and to_timestamp(v.fecha,'yyyy-mm-dd HH24:MI:SS') >= date_trunc('month', current_timestamp at time zone 'America/Bogota' - interval '1' month) and vp.producto not like '%SES%' and v.cliente=$1 group by q.producto,q.nombre,q.precio,vp.cantidad",[cedula])
      let deudaMesActual;
      deudaMesActual = await pool.query("select  coalesce(round(sum(valor)),0) as valor from ventas where cliente=$1 \
        and (to_timestamp(fecha,'yyyy-mm-dd HH24:MI:SS') < date_trunc('month', current_timestamp at time zone 'America/Bogota')) \
        and to_timestamp(fecha,'yyyy-mm-dd HH24:MI:SS') >= date_trunc('month', current_timestamp at time zone 'America/Bogota' - interval '1' month)",[cedula])
      let deudaSinSesiones = await pool.query("select  coalesce(round(sum(valor)),0) as valor from ventas where cliente=$1 \
        and (to_timestamp(fecha,'yyyy-mm-dd HH24:MI:SS') < date_trunc('month', current_timestamp at time zone 'America/Bogota')) \
        and to_timestamp(fecha,'yyyy-mm-dd HH24:MI:SS') >= date_trunc('month', current_timestamp at time zone 'America/Bogota' - interval '1' month) and sesion is null",[cedula])
      let deudaSesiones = await pool.query("select  coalesce(round(sum(valor)),0) as valor from ventas where cliente=$1 \
        and (to_timestamp(fecha,'yyyy-mm-dd HH24:MI:SS') < date_trunc('month', current_timestamp at time zone 'America/Bogota')) \
        and to_timestamp(fecha,'yyyy-mm-dd HH24:MI:SS') >= date_trunc('month', current_timestamp at time zone 'America/Bogota' - interval '1' month) and sesion is not null",[cedula])
      let abonoMesActual = await pool.query("select coalesce(round(sum(valor)),0) as abonos from abonos a where a.cliente=$1  \
      and (to_timestamp(a.fecha,'yyyy-mm-dd HH24:MI:SS') >= date_trunc('month', current_timestamp at time zone 'America/Bogota' - interval '1' month))  \
      and (to_timestamp(a.fecha,'yyyy-mm-dd HH24:MI:SS') < date_trunc('month', current_timestamp at time zone 'America/Bogota'))",[cedula])
      if(!cuenta.rows[0].anticipado){
         ventas = await pool.query("select fecha, round(valor) as valor from ventas where cliente=$1 \
         and (to_timestamp(fecha,'yyyy-mm-dd HH24:MI:SS') < date_trunc('month', current_timestamp at time zone 'America/Bogota')) \
         and to_timestamp(fecha,'yyyy-mm-dd HH24:MI:SS') >= date_trunc('month', current_timestamp at time zone 'America/Bogota' - interval '1' month) and \
         valor !=$2 and valor!=$3",[cedula,((cuenta.rows[0].precio_sesion!=null&&cuenta.rows[0].precio_sesion!=0)?cuenta.rows[0].precio_sesion:sesion.rows[0].precio),sesionVirtual.rows[0].precio])
        }else{
         ventas = await pool.query("select fecha, round(valor) as valor from ventas where cliente=$1 \
         and (to_timestamp(fecha,'yyyy-mm-dd HH24:MI:SS') < date_trunc('month', current_timestamp at time zone 'America/Bogota')) \
         and to_timestamp(fecha,'yyyy-mm-dd HH24:MI:SS') >= date_trunc('month', current_timestamp at time zone 'America/Bogota' - interval '1' month)",[cedula])
       }

      let sesionesHtml;
      if(cuenta.rows[0].habilitado){
        if(cuenta.rows[0].anticipado){
          let sesionesTotalesTomadasSaldoAnterior = parseFloat(totalSesionesTomadasSaldoAnterior.rows[0].sesiones)+parseFloat(totalSesionesVirtualesTomadasSaldoAnterior.rows[0].sesiones)
          console.log("Sesiones totales tomadas: "+sesionesTotalesTomadasSaldoAnterior)
          let sesionesPagadasSaldoAnterior = (parseFloat(sesionesVentasProductosSaldoAnterior.rows[0].sesiones)+parseFloat(sesionesVentasPaquetesSaldoAnterior.rows[0].sesiones))
          console.log("Sesiones totales pagadas: "+sesionesTotalesTomadasSaldoAnterior)
          let saldoAnteriorSesiones = sesionesPagadasSaldoAnterior-sesionesTotalesTomadasSaldoAnterior
          console.log("Saldo Anteiror Sesiones: "+sesionesTotalesTomadasSaldoAnterior)
          let sesionesPagadas = (parseFloat(sesionesVentasProductos.rows[0].sesiones)+parseFloat(sesionesVentasPaquetes.rows[0].sesiones))
          let sesionesPagadasMes = (parseFloat(sesionesVentasProductosMes.rows[0].sesiones)+parseFloat(sesionesVentasPaquetesMes.rows[0].sesiones))
          let sesionesTomadas2 = (parseFloat(totalSesionesTomadas.rows[0].sesiones)+parseFloat(totalSesionesVirtualesTomadas.rows[0].sesiones))
          let sesionesRestantes = (sesionesPagadas-sesionesTomadas2)
          let saldoTotalPre = parseFloat(deuda.rows[0]?deuda.rows[0].debito:0) - parseFloat(abonosValue.rows[0]?abonosValue.rows[0].abonos:0)
          let saldoTotal = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(saldoTotalPre)
          let saldoAnteriorMasCompras = parseFloat(deudaAnterior.rows[0]?deudaAnterior.rows[0].debito:0)-parseFloat(abonosAnteriorValue.rows[0]?abonosAnteriorValue.rows[0].abonos:0) + parseFloat(deudaMesActual.rows[0]?deudaMesActual.rows[0].valor:0)
          let saldoAnteror = parseFloat(deudaAnterior.rows[0]?deudaAnterior.rows[0].debito:0)-parseFloat(abonosAnteriorValue.rows[0]?abonosAnteriorValue.rows[0].abonos:0)
          console.log("Saldo Anteror 1:"+saldoAnteror)
          let debito = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(saldoAnteriorMasCompras)
          let textoSaldoTotal,textoSesionesRestantes,textoSesionesRestantesAnterior;
          let validarSesiones=sesionesRestantes;
          if(saldoAnteriorSesiones<0){
            textoSesionesRestantesAnterior="Pendiente de pago: "+(saldoAnteriorSesiones*-1)+" Sesiones"
          }
          else{
            textoSesionesRestantesAnterior=saldoAnteriorSesiones
          }
          if(saldoAnteror < 0){
            saldoAnteror = "Saldo a favor de "+ new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(saldoAnteror*-1)
            console.log("Saldo Anteror 2:"+saldoAnteror)
          }else{
            saldoAnteror = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(saldoAnteror)
            console.log("Saldo Anteror 2.1:"+saldoAnteror)
          }
          if(sesionesRestantes<0){
            textoSesionesRestantes = "Pendiente de pago: "+(sesionesRestantes*-1)+" Sesiones"
          }else{
            textoSesionesRestantes = sesionesRestantes;
          }
          console.log("texto1: "+textoSesionesRestantes)
          if(saldoTotalPre>0){
            textoSaldoTotal=saldoTotal
            if(sesionesRestantes<0){
              textoSesionesRestantes = '<tr> \
                                        <th style="border:1px solid black">Sesiones Restantes:</th>\
                                        <th style="border:1px solid black">'+textoSesionesRestantes+'</th>\
                                      </tr>'
            }else{
              textoSesionesRestantes=""
            }
          }else if(saldoTotalPre<0){
            textoSaldoTotal = "Saldo a favor de "+(new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(saldoTotalPre*-1))
            textoSesionesRestantes = '<tr> \
                                        <th style="border:1px solid black">Sesiones Restantes:</th>\
                                        <th style="border:1px solid black">'+textoSesionesRestantes+'</th>\
                                      </tr>'
          }
          else{
            if(validarSesiones<0){
              textoSaldoTotal="Debes adquirir un nuevo paquete de sesiones"
            }
            else{
              textoSaldoTotal="Saldo al día"
            }
          }
          console.log("sesiones restantes"+sesionesRestantes)
          if(sesionesRestantes<0){
            textoSaldoTotal+= ", Pendiente de pago: "+(sesionesRestantes*-1)+" Sesiones"
          }
          console.log("Saldo Anteror 3:"+saldoAnteror)
          sesionesHtml='<tr style="font-weight:bold"> \
                Sesiones \
            </tr> \
            <tr> \
              <th style="border:1px solid black">Sesiones Agendadas en el Mes:</th>\
              <th style="border:1px solid black">'+parseFloat(sesionesTomadas.rows[0].sesiones)+'</th>\
            </tr> \
            <tr> \
              <th style="border:1px solid black">Sesiones Vendidas en el Mes:</th>\
              <th style="border:1px solid black">'+sesionesPagadasMes+'</th>\
            </tr> \
            <tr> \
              <th style="border:1px solid black">Saldo Anterior Sesiones:</th>\
              <th style="border:1px solid black">'+textoSesionesRestantesAnterior+'</th>\
            </tr>' + textoSesionesRestantes + '<tr style="font-weight:bold"> \
            Estados\
          </tr>\
          <tr> \
            <th style="border:1px solid black">Saldo Anterior (Sesiones, Suplementos, Otros):</th>\
            <th style="border:1px solid black">'+saldoAnteror+'</th>\
          </tr> \
          <tr> \
            <th style="border:1px solid black">Compras del mes (Sesiones, Suplementos, Otros):</th>\
            <th style="border:1px solid black">'+new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(parseFloat(deudaMesActual.rows[0]?deudaMesActual.rows[0].valor:0))+'</th>\
          </tr> \
          <tr> \
            <th style="border:1px solid black">Pagos del mes:</th>\
            <th style="border:1px solid black">'+new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(parseFloat(abonoMesActual.rows[0]?abonoMesActual.rows[0].abonos:0))+'</th>\
          </tr> \
          <tr> \
            <th style="border:1px solid black">Saldo Total por Pagar:</th>\
            <th style="border:1px solid black">'+textoSaldoTotal+'</th>\
          </tr>' 
          ;
        }else{
          deudaSesiones = deudaSesiones.rows[0].valor
          let saldoAnterior = parseFloat(deudaAnterior.rows[0]?deudaAnterior.rows[0].debito:0)-parseFloat(abonosAnteriorValue.rows[0]?abonosAnteriorValue.rows[0].abonos:0);
          deudaSinSesiones = deudaSinSesiones.rows[0].valor;
          let deudaTotalSesiones = (deudaSesiones);
          let deudaTotal = parseFloat(deuda.rows[0]?(deuda.rows[0].debito):0) - parseFloat(abonosValue.rows[0].abonos);
          let textoSaldoTotal;
          if(deudaTotal>0){
            textoSaldoTotal=new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(deudaTotal)
          }else if(deudaTotal<0){
            textoSaldoTotal="Saldo a favor de "+new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(deudaTotal*-1)
          }
          else{
            if(deudaTotalSesiones<0){
              let deudaText= deudaTotalSesiones*-1;
              textoSaldoTotal="Debe " + deudaText + " Sesiones";
            }else{
              textoSaldoTotal="Saldo al día"
            }
          }
          sesionesHtml='<tr style="font-weight:bold"> \
          Sesiones \
          </tr> \
          <tr> \
            <th style="border:1px solid black">Sesiones Agendadas en el Mes:</th>\
            <th style="border:1px solid black">'+sesionesTomadas.rows[0].sesiones+'</th>\
            <th style="border:1px solid black">Sesiones Virtuales Agendadas en el Mes:</th>\
            <th style="border:1px solid black">'+sesionesVirtualesTomadas.rows[0].sesiones+'</th>\
            <th style="border:1px solid black">Valor Sesiones Tomadas:</th>\
            <th style="border:1px solid black">'+new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(deudaTotalSesiones)+'</th>\
          </tr> \
          <tr style="font-weight:bold"> \
                Estados\
              </tr>\
              <tr> \
                <th style="border:1px solid black">Saldo Anterior (Sesiones, Suplementos, Otros):</th>\
                <th style="border:1px solid black">'+new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(saldoAnterior)+'</th>\
              </tr> \
              <tr> \
                <th style="border:1px solid black">Compras del mes (Sesiones, Suplementos, Otros):</th>\
                <th style="border:1px solid black">'+new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(parseFloat(deudaSinSesiones))+'</th>\
              </tr> \
              <tr> \
                <th style="border:1px solid black">Valor Sesiones Tomadas:</th>\
                <th style="border:1px solid black">'+new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(deudaTotalSesiones)+'</th>\
              </tr> \
              <tr> \
                <th style="border:1px solid black">Pagos del mes:</th>\
                <th style="border:1px solid black">'+new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(abonoMesActual.rows[0].abonos)+'</th>\
              </tr> \
              <tr> \
                <th style="border:1px solid black">Saldo por Pagar:</th>\
                <th style="border:1px solid black">'+textoSaldoTotal+'</th>\
              </tr>';
        }
        let htmlRowSuplemento = ""
        let htmlRowProteina = ""
        let htmlRow2= ""
        suplementos.rows.forEach(suplemento=>{
          htmlRowSuplemento+='<tr><td style="border:1px solid black">'+suplemento.nombre+'</td>'
          htmlRowSuplemento+='<td style="border:1px solid black">'+suplemento.cantidad+'</td>'
          htmlRowSuplemento+='<td style="border:1px solid black">'+new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(suplemento.precio)+'</td></tr>'
        })
        proteinas.rows.forEach(proteina=>{
          htmlRowProteina+='<tr><td style="border:1px solid black">'+proteina.nombre+'</td>'
          htmlRowProteina+='<td style="border:1px solid black">'+proteina.cantidad+'</td>'
          htmlRowProteina+='<td style="border:1px solid black">'+new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(proteina.precio)+'</td></tr>'
        })
        abonos.rows.forEach(abono =>{
          htmlRow2+='<tr><td style="border:1px solid black">'+cuenta.rows[0].nombre+'</td>'
          htmlRow2+='<td style="border:1px solid black">'+abono.fecha+'</td>'
          htmlRow2+='<td style="border:1px solid black">'+new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(abono.valor)+'</td>'
          htmlRow2+='<td style="border:1px solid black">'+abono.tipo+'</td></tr>'
        })
  
        let titulo;
        if(fechaInicio && fechaFin){
          titulo='<h2>Estado de Cuenta Strength Club: '+fechaInicio+'-----'+fechaFin+ '------' + cuenta.rows[0].nombre+'</h2>'
        }else{

          const date = new Date();

          const firstDayPrevMonth = new Date(date.getFullYear(), date.getMonth() - 1, 1);
          const lastDayPrevMonth = new Date(date.getFullYear(), date.getMonth(), 0);
          titulo='<h2>Estado de Cuenta Strength Club: '+firstDayPrevMonth.toDateString()+'-----'+lastDayPrevMonth.toDateString()+'-----'+cuenta.rows[0].nombre+'</h2>'
        }
        let mailData = {
          from: process.env.MAIL_ACCOUNT,
          to: cuenta.rows[0].email,
          subject: "Notificacion de Estado de Cuentas",
          text : "Estado de Cuentas",
          html: '<!doctype html> \
          <html ⚡4email> \
            <head> \
              <meta charset="utf-8"> \
              <script async src="https://cdn.ampproject.org/v0.js"></script> \
              <script async custom-element="amp-anim" src="https://cdn.ampproject.org/v0/amp-anim-0.1.js"></script> \
            </head> \
            <body>' 
            + titulo + 
            '<table style="width:100%; border:1px solid black"> \
            <tr style="font-weight:bold"> \
            Compras\
            </tr> \
            <tr style="font-weight:bold"> \
            Proteinas\
            </tr> \
              <tr> \
                <th style="border:1px solid black">Producto</th> \
                <th style="border:1px solid black">Cantidad</th> \
                <th style="border:1px solid black">Valor</th> \
              </tr> \
             '+htmlRowProteina+' \
            <tr style="font-weight:bold"> \
            Suplementos\
            </tr> \
              <tr> \
                <th style="border:1px solid black">Producto</th> \
                <th style="border:1px solid black">Cantidad</th> \
                <th style="border:1px solid black">Valor</th> \
              </tr> \
             '+htmlRowSuplemento+' \
            </table><br><br> \
            <table style="width:100%; border:1px solid black"> \
              <tr style="font-weight:bold"> \
                Abonos\
              </tr>\
              <tr> \
                <th style="border:1px solid black">Nombre</th> \
                <th style="border:1px solid black">Fecha</th> \
                <th style="border:1px solid black">Valor</th> \
                <th style="border:1px solid black">Tipo</th> \
              </tr> \
              '+htmlRow2+'\
            </table><br><br> \
            <table style="width:100%; border:1px solid black">'+sesionesHtml+'\
              </table> \
              <p>* Sesiones Vendidas: Las sesiones vendidas son aquellas que se han registrado en la plataforma como ventas de paquetes de sesiones o sesiones individuales. Sin embargo, estas ventas registradas no necesariamente indican que las sesiones hayan sido pagadas.</p> \
              <p>* Saldo Total: Diferencia entre el total de compras registradas en el sistema y todos los abonos/pagos registrados. Puede darse el caso de que el cliente agende más sesiones de las acordadas, las cuales se reflejarán por separado en este campo.</p> \
              <p>* Saldo Anterior Sesiones: Indica el saldo de sesiones acumulado hasta el mes anterior. Un número positivo representa la cantidad de sesiones disponibles para agendar, provenientes de paquetes adquiridos previamente. Si el saldo es negativo, se reflejará la cantidad de sesiones adeudadas junto con el texto correspondiente que indica la deuda.</p> \
            </body> \
          </html>'
        }
        transporter.sendMail(mailData, (error,info)=>{
          if(error){
            console.log("Error con la cedula: "+cedula)
            console.log(error)
            response.status(500)
            .send({
              message: error
            }); 
            return;
          }
          
          imap.once('ready', function () {
            imap.openBox('INBOX.Sent', false, (err, box) => {
              if (err) {console.log(err);
                        throw err;
              }
              let msg, htmlEntity, plainEntity;
              msg = mimemessage.factory({
                contentType: 'multipart/alternate',
                body: []
              });
              htmlEntity = mimemessage.factory({
                contentType: 'text/html;charset=utf-8',
                body: mailData.html
              });
              plainEntity = mimemessage.factory({
                body: mailData.text
              });
              msg.header('From', mailData.from);
              msg.header('To', mailData.to);
              msg.header('Subject', mailData.subject);
              msg.header('Date', new Date());
              msg.body.push(plainEntity);
              msg.body.push(htmlEntity);
              imap.append(msg.toString());
              imap.end()
            })
          });

          imap.connect();
          response.status(200).send({
            message:mailData
          })
          return;
        })
      }else{
        response.status(405)
        .send({
          message: "No se puede notificar un cliente deshabilitado"
        });
      }
    } catch (error) {
      console.log("Error con la cedula: "+cedula)
      console.log(error)
      response.status(500)
      .send({
        message: error
      });
      return;
    }
  }


  const getCorreo = async (request,response)=>{
    let cedula = request.body.cedula;
    console.log("Enviando correo a " +cedula)
    let fechaInicio = request.body.fechaInicio;
    let fechaFin = request.body.fechaFin;
    let cuenta;let ventas;
    let abonos;
    let abonosValue;
    let abonosAnteriorValue;
    let sesionesTomadas;
    let sesionesVentasProductos;
    let sesionesVentasPaquetes;
    let sesionesVentasProductosMes;
    let sesionesVentasPaquetesMes;
    let deuda;
    let deudaAnterior;
    let sesion,suplementos,proteinas;
    try {
      sesion = await pool.query("select round(precio) as precio from productos where codigo='SES'");
      sesionVirtual = await pool.query("select round(precio) as precio from productos where codigo='SESV'");
      cuenta = await pool.query("select nombre,email ,anticipado, habilitado, round(precio_sesion) as precio_sesion from clientes where cedula=$1",[cedula]);
      sesionesTomadas = await pool.query("select count(*) as sesiones from sesiones s where s.cliente=$1 and virtual=false \
       and (fecha < date_trunc('month', current_timestamp at time zone 'America/Bogota')) \
       and (fecha >= date_trunc('month', current_timestamp at time zone 'America/Bogota' - interval '1' month))",[cedula])
      let totalSesionesTomadas = await pool.query("select count(*) as sesiones from sesiones s where s.cliente=$1 and virtual=false \
       and (fecha < date_trunc('month', current_timestamp at time zone 'America/Bogota'))",[cedula])
      let totalSesionesTomadasSaldoAnterior = await pool.query("select count(*) as sesiones from sesiones s where s.cliente=$1 and virtual=false \
       and (fecha < date_trunc('month', current_timestamp at time zone 'America/Bogota') - INTERVAL '1 months')",[cedula])
      sesionesVirtualesTomadas = await pool.query("select count(*) as sesiones from sesiones s where s.cliente=$1 and virtual=true \
       and (fecha < date_trunc('month', current_timestamp at time zone 'America/Bogota'))\
       and (fecha >= date_trunc('month', current_timestamp at time zone 'America/Bogota' - interval '1' month))",[cedula])
      let totalSesionesVirtualesTomadas = await pool.query("select count(*) as sesiones from sesiones s where s.cliente=$1 and virtual=true \
       and (fecha < date_trunc('month', current_timestamp at time zone 'America/Bogota'))",[cedula])
      let totalSesionesVirtualesTomadasSaldoAnterior = await pool.query("select count(*) as sesiones from sesiones s where s.cliente=$1 and virtual=true \
       and (fecha < date_trunc('month', current_timestamp at time zone 'America/Bogota'- INTERVAL '1' month) )",[cedula])
       sesionesVentasProductos = await pool.query("select coalesce(sum(vp.cantidad),0) as sesiones from ventas v \
      inner join ventas_productos vp on vp.venta = v.id \
      where vp.producto like '%SES%' and v.cliente=$1  \
       and (to_timestamp(v.fecha,'yyyy-mm-dd HH24:MI:SS') < date_trunc('month', current_timestamp at time zone 'America/Bogota'))",[cedula])
       sesionesVentasPaquetes = await pool.query("select coalesce(sum(pp.cantidad*vp.cantidad),0) as sesiones from ventas v \
      inner join ventas_paquetes vp on vp.venta = v.id \
      inner join productos_paquete pp on pp.codigo_paquete = vp.paquete where v.cliente=$1 and pp.codigo_producto like '%SES%' \
       and (to_timestamp(v.fecha,'yyyy-mm-dd HH24:MI:SS') < date_trunc('month', current_timestamp at time zone 'America/Bogota'))",[cedula])
       let sesionesVentasProductosSaldoAnterior = await pool.query("select coalesce(sum(vp.cantidad),0) as sesiones from ventas v \
      inner join ventas_productos vp on vp.venta = v.id \
      where vp.producto like '%SES%' and v.cliente=$1  \
       and (to_timestamp(v.fecha,'yyyy-mm-dd HH24:MI:SS') < date_trunc('month', current_timestamp at time zone 'America/Bogota' - INTERVAL '1' month))",[cedula])
       let sesionesVentasPaquetesSaldoAnterior = await pool.query("select coalesce(sum(pp.cantidad*vp.cantidad),0) as sesiones from ventas v \
      inner join ventas_paquetes vp on vp.venta = v.id \
      inner join productos_paquete pp on pp.codigo_paquete = vp.paquete where v.cliente=$1 and pp.codigo_producto like '%SES%' \
       and (to_timestamp(v.fecha,'yyyy-mm-dd HH24:MI:SS') < date_trunc('month', current_timestamp at time zone 'America/Bogota' - INTERVAL '1' month))",[cedula])
       sesionesVentasProductosMes = await pool.query("select coalesce(sum(vp.cantidad),0) as sesiones from ventas v \
      inner join ventas_productos vp on vp.venta = v.id \
      where vp.producto like '%SES%' and v.cliente=$1  \
       and (to_timestamp(v.fecha,'yyyy-mm-dd HH24:MI:SS') < date_trunc('month', current_timestamp at time zone 'America/Bogota')) \
       and (to_timestamp(fecha,'yyyy-mm-dd HH24:MI:SS') >= date_trunc('month', current_timestamp at time zone 'America/Bogota' - interval '1' month))",[cedula])
       sesionesVentasPaquetesMes = await pool.query("select coalesce(sum(pp.cantidad*vp.cantidad),0) as sesiones from ventas v \
      inner join ventas_paquetes vp on vp.venta = v.id \
      inner join productos_paquete pp on pp.codigo_paquete = vp.paquete where v.cliente=$1 and pp.codigo_producto like '%SES%' \
       and (to_timestamp(v.fecha,'yyyy-mm-dd HH24:MI:SS') < date_trunc('month', current_timestamp at time zone 'America/Bogota'))\
       and (to_timestamp(fecha,'yyyy-mm-dd HH24:MI:SS') >= date_trunc('month', current_timestamp at time zone 'America/Bogota' - interval '1' month))",[cedula])
       abonosValue = await pool.query("select coalesce(round(sum(valor)),0) as abonos from abonos a where a.cliente=$1  \
       and (to_timestamp(a.fecha,'yyyy-mm-dd HH24:MI:SS') < date_trunc('month', current_timestamp at time zone 'America/Bogota'))",[cedula])
       abonosAnteriorValue = await pool.query("select coalesce(round(sum(valor)),0) as abonos from abonos a where a.cliente=$1  \
       and (to_timestamp(a.fecha,'yyyy-mm-dd HH24:MI:SS') < date_trunc('month', current_timestamp at time zone 'America/Bogota' - interval '1' month))",[cedula])
       deuda = await pool.query("select c.cedula, round(sum(v.valor)) as debito from clientes c \
        left join ventas v on v.cliente = c.cedula  \
        where c.cedula=$1 and (to_timestamp(v.fecha,'yyyy-mm-dd HH24:MI:SS') < date_trunc('month', current_timestamp at time zone 'America/Bogota')) group by c.cedula",[cedula])
       deudaAnterior = await pool.query("select coalesce(round(sum(v.valor)),0) as debito from clientes c \
        left join ventas v on v.cliente = c.cedula  \
        where c.cedula=$1 and (to_timestamp(v.fecha,'yyyy-mm-dd HH24:MI:SS') < date_trunc('month', current_timestamp at time zone 'America/Bogota' - interval '1' month)) group by c.cedula",[cedula])
      abonos = await pool.query("select *, round(valor) as valor from abonos where cliente=$1 \
       and (to_timestamp(fecha,'yyyy-mm-dd HH24:MI:SS') < date_trunc('month', current_timestamp at time zone 'America/Bogota'))\
       and to_timestamp(fecha,'yyyy-mm-dd HH24:MI:SS') >= date_trunc('month', current_timestamp at time zone 'America/Bogota' - interval '1' month)",[cedula])
      proteinas = await pool.query("select q.codigo_paquete as nombre, count(distinct v.id)*vp.cantidad as cantidad,count(distinct v.id)*vp.cantidad*q.precio as precio from ventas v inner join ventas_paquetes vp on v.id = vp.venta \
      inner JOIN ( \
      	SELECT hp.codigo_paquete, hp.precio,TO_TIMESTAMP(hp.fechaInicio,'YYYY-MM-DD HH24:MI') as fechaInicio, coalesce(TO_TIMESTAMP(hp.fechafin,'YYYY-MM-DD HH24:MI'),current_timestamp at time zone 'America/Bogota') as fechaFin \
      	FROM historico_paquetes hp \
      ) q ON q.codigo_paquete=vp.paquete and \
      (TO_TIMESTAMP(v.fecha,'YYYY-MM-DD HH24:MI') > q.fechaInicio and TO_TIMESTAMP(v.fecha,'YYYY-MM-DD HH24:MI') < q.fechaFin) \
      where (to_timestamp(fecha,'yyyy-mm-dd HH24:MI:SS') < date_trunc('month', current_timestamp at time zone 'America/Bogota')) \
      and to_timestamp(fecha,'yyyy-mm-dd HH24:MI:SS') >= date_trunc('month', current_timestamp at time zone 'America/Bogota' - interval '1' month) and vp.paquete not like '%SES%' and v.cliente=$1 group by q.codigo_paquete,vp.cantidad,q.precio",[cedula])
      suplementos = await pool.query("select q.nombre, q.producto, count(distinct v.id)*q.precio*vp.cantidad as precio, count(distinct v.id)*vp.cantidad as cantidad from ventas v inner join \
      ventas_productos vp on v.id = vp.venta \
      inner join \
      ( \
      	select pr.nombre,p.producto,p.precio,TO_TIMESTAMP(p.fechaInicio,'YYYY-MM-DD HH24:MI') as fechaInicio, coalesce(TO_TIMESTAMP(p.fechafin,'YYYY-MM-DD HH24:MI'),current_timestamp at time zone 'America/Bogota') as fechaFin \
      	from historico_productos p INNER JOIN productos pr on pr.codigo=p.producto \
      ) \
      q on q.producto = vp.producto and \
      (TO_TIMESTAMP(v.fecha,'YYYY-MM-DD HH24:MI') > q.fechaInicio and TO_TIMESTAMP(v.fecha,'YYYY-MM-DD HH24:MI') < q.fechaFin) \
      where (to_timestamp(v.fecha,'yyyy-mm-dd HH24:MI:SS') < date_trunc('month', current_timestamp at time zone 'America/Bogota')) \
      and to_timestamp(v.fecha,'yyyy-mm-dd HH24:MI:SS') >= date_trunc('month', current_timestamp at time zone 'America/Bogota' - interval '1' month) and vp.producto not like '%SES%' and v.cliente=$1 group by q.producto,q.nombre,q.precio,vp.cantidad",[cedula])
      let deudaMesActual;
      deudaMesActual = await pool.query("select  coalesce(round(sum(valor)),0) as valor from ventas where cliente=$1 \
        and (to_timestamp(fecha,'yyyy-mm-dd HH24:MI:SS') < date_trunc('month', current_timestamp at time zone 'America/Bogota')) \
        and to_timestamp(fecha,'yyyy-mm-dd HH24:MI:SS') >= date_trunc('month', current_timestamp at time zone 'America/Bogota' - interval '1' month)",[cedula])
      let deudaSinSesiones = await pool.query("select  coalesce(round(sum(valor)),0) as valor from ventas where cliente=$1 \
        and (to_timestamp(fecha,'yyyy-mm-dd HH24:MI:SS') < date_trunc('month', current_timestamp at time zone 'America/Bogota')) \
        and to_timestamp(fecha,'yyyy-mm-dd HH24:MI:SS') >= date_trunc('month', current_timestamp at time zone 'America/Bogota' - interval '1' month) and sesion is null",[cedula])
      let deudaSesiones = await pool.query("select  coalesce(round(sum(valor)),0) as valor from ventas where cliente=$1 \
        and (to_timestamp(fecha,'yyyy-mm-dd HH24:MI:SS') < date_trunc('month', current_timestamp at time zone 'America/Bogota')) \
        and to_timestamp(fecha,'yyyy-mm-dd HH24:MI:SS') >= date_trunc('month', current_timestamp at time zone 'America/Bogota' - interval '1' month) and sesion is not null",[cedula])
      let abonoMesActual = await pool.query("select coalesce(round(sum(valor)),0) as abonos from abonos a where a.cliente=$1  \
      and (to_timestamp(a.fecha,'yyyy-mm-dd HH24:MI:SS') >= date_trunc('month', current_timestamp at time zone 'America/Bogota' - interval '1' month))  \
      and (to_timestamp(a.fecha,'yyyy-mm-dd HH24:MI:SS') < date_trunc('month', current_timestamp at time zone 'America/Bogota'))",[cedula])
      if(!cuenta.rows[0].anticipado){
         ventas = await pool.query("select fecha, round(valor) as valor from ventas where cliente=$1 \
         and (to_timestamp(fecha,'yyyy-mm-dd HH24:MI:SS') < date_trunc('month', current_timestamp at time zone 'America/Bogota')) \
         and to_timestamp(fecha,'yyyy-mm-dd HH24:MI:SS') >= date_trunc('month', current_timestamp at time zone 'America/Bogota' - interval '1' month) and \
         valor !=$2 and valor!=$3",[cedula,((cuenta.rows[0].precio_sesion!=null&&cuenta.rows[0].precio_sesion!=0)?cuenta.rows[0].precio_sesion:sesion.rows[0].precio),sesionVirtual.rows[0].precio])
        }else{
         ventas = await pool.query("select fecha, round(valor) as valor from ventas where cliente=$1 \
         and (to_timestamp(fecha,'yyyy-mm-dd HH24:MI:SS') < date_trunc('month', current_timestamp at time zone 'America/Bogota')) \
         and to_timestamp(fecha,'yyyy-mm-dd HH24:MI:SS') >= date_trunc('month', current_timestamp at time zone 'America/Bogota' - interval '1' month)",[cedula])
       }

      let sesionesHtml;
      if(cuenta.rows[0].habilitado){
        if(cuenta.rows[0].anticipado){
          let sesionesTotalesTomadasSaldoAnterior = parseFloat(totalSesionesTomadasSaldoAnterior.rows[0].sesiones)+parseFloat(totalSesionesVirtualesTomadasSaldoAnterior.rows[0].sesiones)
          console.log("Sesiones totales tomadas: "+sesionesTotalesTomadasSaldoAnterior)
          let sesionesPagadasSaldoAnterior = (parseFloat(sesionesVentasProductosSaldoAnterior.rows[0].sesiones)+parseFloat(sesionesVentasPaquetesSaldoAnterior.rows[0].sesiones))
          console.log("Sesiones totales pagadas: "+sesionesTotalesTomadasSaldoAnterior)
          let saldoAnteriorSesiones = sesionesPagadasSaldoAnterior-sesionesTotalesTomadasSaldoAnterior
          console.log("Saldo Anteiror Sesiones: "+sesionesTotalesTomadasSaldoAnterior)
          let sesionesPagadas = (parseFloat(sesionesVentasProductos.rows[0].sesiones)+parseFloat(sesionesVentasPaquetes.rows[0].sesiones))
          let sesionesPagadasMes = (parseFloat(sesionesVentasProductosMes.rows[0].sesiones)+parseFloat(sesionesVentasPaquetesMes.rows[0].sesiones))
          let sesionesTomadas2 = (parseFloat(totalSesionesTomadas.rows[0].sesiones)+parseFloat(totalSesionesVirtualesTomadas.rows[0].sesiones))
          let sesionesRestantes = (sesionesPagadas-sesionesTomadas2)
          let saldoTotalPre = parseFloat(deuda.rows[0]?deuda.rows[0].debito:0) - parseFloat(abonosValue.rows[0]?abonosValue.rows[0].abonos:0)
          let saldoTotal = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(saldoTotalPre)
          let saldoAnteriorMasCompras = parseFloat(deudaAnterior.rows[0]?deudaAnterior.rows[0].debito:0)-parseFloat(abonosAnteriorValue.rows[0]?abonosAnteriorValue.rows[0].abonos:0) + parseFloat(deudaMesActual.rows[0]?deudaMesActual.rows[0].valor:0)
          let saldoAnteror = parseFloat(deudaAnterior.rows[0]?deudaAnterior.rows[0].debito:0)-parseFloat(abonosAnteriorValue.rows[0]?abonosAnteriorValue.rows[0].abonos:0)
          console.log("Saldo Anteror 1:"+saldoAnteror)
          let debito = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(saldoAnteriorMasCompras)
          let textoSaldoTotal,textoSesionesRestantes,textoSesionesRestantesAnterior;
          let validarSesiones=sesionesRestantes;
          if(saldoAnteriorSesiones<0){
            textoSesionesRestantesAnterior="Pendiente de pago: "+(saldoAnteriorSesiones*-1)+" Sesiones"
          }
          else{
            textoSesionesRestantesAnterior=saldoAnteriorSesiones
          }
          if(saldoAnteror < 0){
            saldoAnteror = "Saldo a favor de "+ new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(saldoAnteror*-1)
            console.log("Saldo Anteror 2:"+saldoAnteror)
          }else{
            saldoAnteror = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(saldoAnteror)
            console.log("Saldo Anteror 2.1:"+saldoAnteror)
          }
          if(sesionesRestantes<0){
            textoSesionesRestantes = "Pendiente de pago: "+(sesionesRestantes*-1)+" Sesiones"
          }else{
            textoSesionesRestantes = sesionesRestantes;
          }
          console.log("texto1: "+textoSesionesRestantes)
          if(saldoTotalPre>0){
            textoSaldoTotal=saldoTotal
            if(sesionesRestantes<0){
              textoSesionesRestantes = '<tr> \
                                        <th style="border:1px solid black">Sesiones Restantes:</th>\
                                        <th style="border:1px solid black">'+textoSesionesRestantes+'</th>\
                                      </tr>'
            }else{
              textoSesionesRestantes=""
            }
          }else if(saldoTotalPre<0){
            textoSaldoTotal = "Saldo a favor de "+(new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(saldoTotalPre*-1))
            textoSesionesRestantes = '<tr> \
                                        <th style="border:1px solid black">Sesiones Restantes:</th>\
                                        <th style="border:1px solid black">'+textoSesionesRestantes+'</th>\
                                      </tr>'
          }
          else{
            if(validarSesiones<0){
              textoSaldoTotal="Debes adquirir un nuevo paquete de sesiones"
            }
            else{
              textoSaldoTotal="Saldo al día"
            }
          }
          console.log("sesiones restantes"+sesionesRestantes)
          if(sesionesRestantes<0){
            textoSaldoTotal+= ", Pendiente de pago: "+(sesionesRestantes*-1)+" Sesiones"
          }
          console.log("Saldo Anteror 3:"+saldoAnteror)
          sesionesHtml='<tr style="font-weight:bold"> \
                Sesiones \
            </tr> \
            <tr> \
              <th style="border:1px solid black">Sesiones Agendadas en el Mes:</th>\
              <th style="border:1px solid black">'+parseFloat(sesionesTomadas.rows[0].sesiones)+'</th>\
            </tr> \
            <tr> \
              <th style="border:1px solid black">Sesiones Vendidas en el Mes:</th>\
              <th style="border:1px solid black">'+sesionesPagadasMes+'</th>\
            </tr> \
            <tr> \
              <th style="border:1px solid black">Saldo Anterior Sesiones:</th>\
              <th style="border:1px solid black">'+textoSesionesRestantesAnterior+'</th>\
            </tr>' + textoSesionesRestantes + '<tr style="font-weight:bold"> \
            Estados\
          </tr>\
          <tr> \
            <th style="border:1px solid black">Saldo Anterior (Sesiones, Suplementos, Otros):</th>\
            <th style="border:1px solid black">'+saldoAnteror+'</th>\
          </tr> \
          <tr> \
            <th style="border:1px solid black">Compras del mes (Sesiones, Suplementos, Otros):</th>\
            <th style="border:1px solid black">'+new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(parseFloat(deudaMesActual.rows[0]?deudaMesActual.rows[0].valor:0))+'</th>\
          </tr> \
          <tr> \
            <th style="border:1px solid black">Pagos del mes:</th>\
            <th style="border:1px solid black">'+new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(parseFloat(abonoMesActual.rows[0]?abonoMesActual.rows[0].abonos:0))+'</th>\
          </tr> \
          <tr> \
            <th style="border:1px solid black">Saldo Total por Pagar:</th>\
            <th style="border:1px solid black">'+textoSaldoTotal+'</th>\
          </tr>' 
          ;
        }else{
          deudaSesiones = deudaSesiones.rows[0].valor
          let saldoAnterior = parseFloat(deudaAnterior.rows[0]?deudaAnterior.rows[0].debito:0)-parseFloat(abonosAnteriorValue.rows[0]?abonosAnteriorValue.rows[0].abonos:0);
          deudaSinSesiones = deudaSinSesiones.rows[0].valor;
          let deudaTotalSesiones = (deudaSesiones);
          let deudaTotal = parseFloat(deuda.rows[0]?(deuda.rows[0].debito):0) - parseFloat(abonosValue.rows[0].abonos);
          let textoSaldoTotal;
          if(deudaTotal>0){
            textoSaldoTotal=new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(deudaTotal)
          }else if(deudaTotal<0){
            textoSaldoTotal="Saldo a favor de "+new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(deudaTotal*-1)
          }
          else{
            if(deudaTotalSesiones<0){
              let deudaText= deudaTotalSesiones*-1;
              textoSaldoTotal="Debe " + deudaText + " Sesiones";
            }else{
              textoSaldoTotal="Saldo al día"
            }
          }
          sesionesHtml='<tr style="font-weight:bold"> \
          Sesiones \
          </tr> \
          <tr> \
            <th style="border:1px solid black">Sesiones Agendadas en el Mes:</th>\
            <th style="border:1px solid black">'+sesionesTomadas.rows[0].sesiones+'</th>\
            <th style="border:1px solid black">Sesiones Virtuales Agendadas en el Mes:</th>\
            <th style="border:1px solid black">'+sesionesVirtualesTomadas.rows[0].sesiones+'</th>\
            <th style="border:1px solid black">Valor Sesiones Tomadas:</th>\
            <th style="border:1px solid black">'+new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(deudaTotalSesiones)+'</th>\
          </tr> \
          <tr style="font-weight:bold"> \
                Estados\
              </tr>\
              <tr> \
                <th style="border:1px solid black">Saldo Anterior (Sesiones, Suplementos, Otros):</th>\
                <th style="border:1px solid black">'+new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(saldoAnterior)+'</th>\
              </tr> \
              <tr> \
                <th style="border:1px solid black">Compras del mes (Sesiones, Suplementos, Otros):</th>\
                <th style="border:1px solid black">'+new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(parseFloat(deudaSinSesiones))+'</th>\
              </tr> \
              <tr> \
                <th style="border:1px solid black">Valor Sesiones Tomadas:</th>\
                <th style="border:1px solid black">'+new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(deudaTotalSesiones)+'</th>\
              </tr> \
              <tr> \
                <th style="border:1px solid black">Pagos del mes:</th>\
                <th style="border:1px solid black">'+new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(abonoMesActual.rows[0].abonos)+'</th>\
              </tr> \
              <tr> \
                <th style="border:1px solid black">Saldo por Pagar:</th>\
                <th style="border:1px solid black">'+textoSaldoTotal+'</th>\
              </tr>';
        }
        let htmlRowSuplemento = ""
        let htmlRowProteina = ""
        let htmlRow2= ""
        suplementos.rows.forEach(suplemento=>{
          htmlRowSuplemento+='<tr><td style="border:1px solid black">'+suplemento.nombre+'</td>'
          htmlRowSuplemento+='<td style="border:1px solid black">'+suplemento.cantidad+'</td>'
          htmlRowSuplemento+='<td style="border:1px solid black">'+new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(suplemento.precio)+'</td></tr>'
        })
        proteinas.rows.forEach(proteina=>{
          htmlRowProteina+='<tr><td style="border:1px solid black">'+proteina.nombre+'</td>'
          htmlRowProteina+='<td style="border:1px solid black">'+proteina.cantidad+'</td>'
          htmlRowProteina+='<td style="border:1px solid black">'+new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(proteina.precio)+'</td></tr>'
        })
        abonos.rows.forEach(abono =>{
          htmlRow2+='<tr><td style="border:1px solid black">'+cuenta.rows[0].nombre+'</td>'
          htmlRow2+='<td style="border:1px solid black">'+abono.fecha+'</td>'
          htmlRow2+='<td style="border:1px solid black">'+new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(abono.valor)+'</td>'
          htmlRow2+='<td style="border:1px solid black">'+abono.tipo+'</td></tr>'
        })
  
        let titulo;
        if(fechaInicio && fechaFin){
          titulo='<h2>Estado de Cuenta Strength Club: '+fechaInicio+'-----'+fechaFin+ '------' + cuenta.rows[0].nombre+'</h2>'
        }else{

          const date = new Date();

          const firstDayPrevMonth = new Date(date.getFullYear(), date.getMonth() - 1, 1);
          const lastDayPrevMonth = new Date(date.getFullYear(), date.getMonth(), 0);
          titulo='<h2>Estado de Cuenta Strength Club: '+firstDayPrevMonth.toDateString()+'-----'+lastDayPrevMonth.toDateString()+'-----'+cuenta.rows[0].nombre+'</h2>'
        }
        let mailData = {
          html: '<!doctype html> \
          <html ⚡4email> \
            <head> \
              <meta charset="utf-8"> \
              <script async src="https://cdn.ampproject.org/v0.js"></script> \
              <script async custom-element="amp-anim" src="https://cdn.ampproject.org/v0/amp-anim-0.1.js"></script> \
            </head> \
            <body>' 
            + titulo + 
            '<table style="width:100%; border:1px solid black"> \
            <tr style="font-weight:bold"> \
            Compras\
            </tr> \
            <tr style="font-weight:bold"> \
            Proteinas\
            </tr> \
              <tr> \
                <th style="border:1px solid black">Producto</th> \
                <th style="border:1px solid black">Cantidad</th> \
                <th style="border:1px solid black">Valor</th> \
              </tr> \
             '+htmlRowProteina+' \
            <tr style="font-weight:bold"> \
            Suplementos\
            </tr> \
              <tr> \
                <th style="border:1px solid black">Producto</th> \
                <th style="border:1px solid black">Cantidad</th> \
                <th style="border:1px solid black">Valor</th> \
              </tr> \
             '+htmlRowSuplemento+' \
            </table><br><br> \
            <table style="width:100%; border:1px solid black"> \
              <tr style="font-weight:bold"> \
                Abonos\
              </tr>\
              <tr> \
                <th style="border:1px solid black">Nombre</th> \
                <th style="border:1px solid black">Fecha</th> \
                <th style="border:1px solid black">Valor</th> \
                <th style="border:1px solid black">Tipo</th> \
              </tr> \
              '+htmlRow2+'\
            </table><br><br> \
            <table style="width:100%; border:1px solid black">'+sesionesHtml+'\
              </table> \
              <p>* Sesiones Vendidas: Las sesiones vendidas son aquellas que se han registrado en la plataforma como ventas de paquetes de sesiones o sesiones individuales. Sin embargo, estas ventas registradas no necesariamente indican que las sesiones hayan sido pagadas.</p> \
              <p>* Saldo Total: Diferencia entre el total de compras registradas en el sistema y todos los abonos/pagos registrados. Puede darse el caso de que el cliente agende más sesiones de las acordadas, las cuales se reflejarán por separado en este campo.</p> \
              <p>* Saldo Anterior Sesiones: Indica el saldo de sesiones acumulado hasta el mes anterior. Un número positivo representa la cantidad de sesiones disponibles para agendar, provenientes de paquetes adquiridos previamente. Si el saldo es negativo, se reflejará la cantidad de sesiones adeudadas junto con el texto correspondiente que indica la deuda.</p> \
            </body> \
          </html>'
        }
        return mailData;
      }else{
        return { html:null }
      }
    } catch (error) {
      console.log("Error mostrando el correo con la cedula: "+cedula)
      return { html:null }
    }
  }

const getClientes = (request,response) =>{
  let query = "SELECT *, TO_CHAR(age(current_timestamp at time zone 'America/Bogota', TO_DATE(fecha_nacimiento,'yyyy-mm-dd')), 'YY') as edad FROM clientes order by nombre asc"
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

const getAbonos = (request,response) =>{
  let query = "SELECT c.nombre, a.id, a.fecha, cast(a.valor as money) as valor, a.usuario, a.tipo \
  FROM abonos a inner join clientes c on c.cedula=a.cliente \
  order by a.fecha desc"
  pool.query(query,(error,results)=>{
    if (error) {
      response.status(500)
          .send({
            message: error
          });
      }else{
        response.status(200).send({abonos:results.rows});
      }
  })
}

const deleteAbono = async(request,response) =>{
  let id = request.body.id
  let query = "DELETE FROM abonos where id=$1"
  let logInfo = await pool.query("select * from abonos where id=$1",[id]);
  console.log("Se borra el abono del cliente "+logInfo.rows[0].cliente + " con valor de "+logInfo.rows[0].valor +" con fecha "+ logInfo.rows[0].fecha)
  pool.query(query,[id],(error,results)=>{
    if (error) {
      response.status(500)
          .send({
            message: error
          });
      }else{
        response.status(200).send({message:"Abono eliminado correctamente"});
      }
  })
}



const postAbono = (request, response)=>{
  let cliente = request.body.cliente;
  let abono = request.body.abono;
  let fecha = request.body.fecha;
  let usuario = request.tokenData;
  let tipo = request.body.tipo;
  if(fecha!==null && fecha!==undefined && fecha !==""){
    pool.query("INSERT INTO abonos(cliente,valor,fecha,usuario,tipo) VALUES ($1,$2,$3,$4,$5)",[cliente,abono,fecha,usuario,tipo],(error,results)=>{
      if (error) {
        console.log(error)
        response.status(500)
            .send({
              message: error
            });
        }else{
          response.status(200).send({abono:"Abono creado exitosamente"});
        }
    })
    return;
  }else{
    pool.query("INSERT INTO abonos(cliente,valor,fecha,usuario,tipo) VALUES ($1,$2,to_char(current_timestamp at time zone 'America/Bogota','YYYY-MM-DD HH24:MI'),$3,$4)",[cliente,abono,usuario,tipo],(error,results)=>{
      if (error) {
        console.log(error)
        response.status(500)
            .send({
              message: error
            });
        }else{
          response.status(200).send({abono:"Abono creado exitosamente"});
        }
    })
  }
}

const getAbonosCliente = async (request,response)=>{
  let cliente = request.body.cliente;
  try {
    let abonos = await pool.query("SELECT fecha,cast(ROUND(valor) as money) as valor,tipo FROM abonos WHERE cliente=$1 and TO_TIMESTAMP(fecha,'YYYY-MM-DD')>=date_trunc('month',current_timestamp at time zone 'America/Bogota')",[cliente])
    response.status(200).send({abonos:abonos.rows});
    return;
  } catch (error) {
    response.status(500).send({abonos:error});
    return;
  }
}

const getContabilidadClientes = (request,response) =>{
  let fechaInicio = request.body.fechaInicio
  let fechaFin = request.body.fechaFin
  let query=""
  if(fechaInicio&&fechaFin){
    query = "select c.cedula, c.nombre, c.email, cast(sum(coalesce(v.valor,0)) as money) as debito, cast(coalesce(q2.valor,0) as money) as abonos, cast(sum(coalesce(v.valor,0))-coalesce(q2.valor,0) as money) as saldo from clientes c \
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
    query = "select c.cedula, c.nombre, c.email, cast(sum(coalesce(v.valor,0)) as money) as debito, cast(coalesce(q2.valor,0) as money) as abonos, cast(sum(coalesce(v.valor,0))-coalesce(q2.valor,0) as money) as saldo from clientes c \
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

const getDetalleContabilidadCliente = async (request,response)=>{
  let cedula = request.body.cedula;
  sesion = await pool.query("select round(precio) as precio from productos where codigo='SES'");
  sesionVirtual = await pool.query("select round(precio) as precio from productos where codigo='SESV'");
  try {
      let cuenta = await pool.query("SELECT * from clientes where cedula=$1",[cedula]);
      let abonosValue = await pool.query("select coalesce(round(sum(valor)),0) as abonos from abonos a where a.cliente=$1",[cedula])
      let deuda = await pool.query("select c.cedula, round(sum(v.valor)) as debito from clientes c \
      left join ventas v on v.cliente = c.cedula where v.cliente=$1 group by c.cedula",[cedula]);
      let sesionesAgendadasTotal = await pool.query("SELECT count(*) as sesiones from sesiones where cliente=$1",[cedula])
      let sesionesAgendadasMes = await pool.query("select count(*) as sesiones from sesiones s where s.cliente=$1 and virtual=false \
      and (fecha > date_trunc('month', current_timestamp at time zone 'America/Bogota' - interval '1' month)) \
     and (fecha <= date_trunc('month', current_timestamp at time zone 'America/Bogota'))",[cedula])
      let sesionesVirtualesAgendadasMes = await pool.query("select count(*) as sesiones from sesiones s where s.cliente=$1 and virtual=true \
      and (fecha > date_trunc('month', current_timestamp at time zone 'America/Bogota'- interval '1' month)) \
      and (fecha <= date_trunc('month', current_timestamp at time zone 'America/Bogota'))",[cedula]);
      let sesionesCompradasProductos = await pool.query("select coalesce(sum(vp.cantidad),0) as sesiones from ventas v \
      inner join ventas_productos vp on vp.venta = v.id \
      where vp.producto LIKE '%SES%' and v.cliente=$1",[cedula]);
      let sesionesCompradasPaquetes = await pool.query("select coalesce(sum(pp.cantidad*vp.cantidad),0) as sesiones from ventas v \
      inner join ventas_paquetes vp on vp.venta = v.id \
      inner join productos_paquete pp on pp.codigo_paquete = vp.paquete where v.cliente=$1 and pp.codigo_producto LIKE '%SES%'",[cedula]);
      let sesionesPagadas, sesionesTomadas,sesionesVirtualesTomadas,deudaSesiones,sesionesRestantes;
      var data = {};
      let html = this.getCorreo(request)
      if(cuenta.rows[0].anticipado){
        sesionesPagadas = parseFloat(sesionesCompradasProductos.rows[0].sesiones) + parseFloat(sesionesCompradasPaquetes.rows[0].sesiones);
        sesionesTomadas = parseFloat(sesionesAgendadasMes.rows[0].sesiones)+parseFloat(sesionesVirtualesAgendadasMes.rows[0].sesiones);
        sesionesRestantes = sesionesPagadas - parseFloat(sesionesAgendadasTotal.rows[0].sesiones);
        data.sesionesPagadas=sesionesPagadas;
        data.sesionesRestantes=sesionesRestantes;
        data.deuda = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(parseFloat(deuda.rows[0]?deuda.rows[0].debito:0) - parseFloat(abonosValue.rows[0]?abonosValue.rows[0].abonos:0))
      }else{
        sesionesTomadas = parseFloat(sesionesAgendadasMes.rows[0].sesiones);
        sesionesVirtualesTomadas= parseFloat(sesionesVirtualesAgendadasMes.rows[0].sesiones);
        deudaSesiones = (sesionesAgendadasMes.rows[0].sesiones*((cuenta.rows[0].precio_sesion!=null&&cuenta.rows[0].precio_sesion!=undefined)?cuenta.rows[0].precio_sesion:sesion.rows[0].precio))+(sesionesVirtualesAgendadasMes.rows[0].sesiones * sesionVirtual.rows[0].precio)
        let deudaSinSesiones = parseFloat(deuda.rows[0]?(deuda.rows[0].debito-deudaSesiones):0);
        let deudaTotal = parseFloat(deudaSesiones) + parseFloat(deudaSinSesiones) - parseFloat(abonosValue.rows[0].abonos);
        data.sesionesVirtualesTomadas=sesionesVirtualesTomadas;
        data.deudaSesiones=new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(deudaSesiones);
        data.deuda=new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(deudaTotal);
      }
      data.sesionesAgendadasTotal=sesionesAgendadasTotal.rows[0].sesiones
      data.sesionesTomadas=sesionesTomadas;
      data.abonos=new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(parseFloat(abonosValue.rows[0].abonos));
      data.anticipado=cuenta.rows[0].anticipado;
      data.email=html.html;

      response.status(200)
            .send({
              data: data
            });
      return;
  } catch (error) {
    console.log(error)
    response.status(500)
            .send({
              data: error
            });
      return;
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
              console.log(error)
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
    let anticipado = request.body.anticipado;
    let precioSesion = request.body.precioSesion;
    let habilitado = request.body.habilitado;
  if(nombre && email && direccion && telefono && cedula && nacimiento){
      pool.query("UPDATE clientes SET nombre=$1,email=$2,direccion=$3,telefono=$4,fecha_nacimiento=$5,anticipado=$7,precio_sesion=$8,habilitado=$9 WHERE cedula=$6", [nombre, email,direccion,telefono,nacimiento,cedula,anticipado,precioSesion,habilitado], (error, results)=>{
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



module.exports = {getCorreo,getDetalleContabilidadCliente,crearCliente,getClientes,deleteClientes,updateCliente, getContabilidadClientes,postAbono,sendEmail,getAbonos,deleteAbono, getAbonosCliente}