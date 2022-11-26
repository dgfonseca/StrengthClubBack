	const Pool = require("pg").Pool

	const pool = new Pool({
		user: process.env.PG_USER,
		host: process.env.PG_HOST,
		database: process.env.PG_DATABASE,
		password: process.env.PG_PASSWORD,
		port: process.env.PG_PORT,
		ssl: false

		});

// 	const pool = new Pool({
//   connectionString:"postgres://emhkofcqvywsys:a8dd8f3cc858551e8bf86b5cceca98361f02972980bf0080a5650855b82fcdff@ec2-54-159-22-90.compute-1.amazonaws.com:5432/d6v6d92eqe67do",
//   ssl: {
//     rejectUnauthorized: false,
//   }
//   });

	const actualizarPaquete = async (request, response) => {
		const client = await pool.connect()
		try {
			let codigoPaquete = request.body.codigo;
			let nombre = request.body.nombre;
			let precio = request.body.precio;
			await client.query('BEGIN');
			await client.query("UPDATE paquetes SET precio=$1,nombre=$2 WHERE codigo=$3",[precio,nombre,codigoPaquete]);
			await client.query("UPDATE historico_paquetes set fechaFin=TO_CHAR(NOW() at TIME ZONE 'America/Bogota', 'yyyy/mm/dd HH24:MI:SS') WHERE codigo_paquete=$1 and fechaFin is null",[codigoPaquete])
			await client.query("INSERT INTO historico_paquetes(codigo_paquete,precio,fechaInicio,fechaFin) values ($1,$2,TO_CHAR(NOW() at TIME ZONE 'America/Bogota', 'yyyy/mm/dd HH24:MI:SS'),null)",[codigoPaquete,precio]);
			await client.query('COMMIT');
			response.status(200).send({
				message:"Paquete actualizado exitosamente"
			});
			return;
		} catch (error) {
			await client.query('ROLLBACK')
			response.status(400).send({
				message:"Error al actualizar paquete: "+error
			});
			return;
		}
	}

	const crearPaquete = async (request, response) => {
		const client = await pool.connect()
		try {
				let codigoPaquete = request.body.codigo;
				let nombre = request.body.nombre;
				let productos = request.body.productos;
				let precio = request.body.precio;
			if(nombre && productos && precio && codigoPaquete){
				await client.query('BEGIN');
				await client.query("INSERT INTO paquetes(codigo,precio,nombre) VALUES($1,$2,$3)",[codigoPaquete,precio,nombre]);
				for (let producto of productos) {
					let codigo = producto.codigo;
					let cantidad = producto.cantidad;
					await client.query("INSERT INTO productos_paquete(codigo_producto,codigo_paquete,cantidad) VALUES($1,$2,$3)",[codigo,codigoPaquete,cantidad]);
				}
				await client.query("INSERT INTO historico_paquetes(codigo_paquete,precio,fechaInicio,fechaFin) values ($1,$2,TO_CHAR(now() at TIME ZONE 'America/Bogota', 'yyyy/mm/dd HH24:MI:SS'),null)",[codigoPaquete,precio]);
				await client.query('COMMIT');
				response.status(200).send({
					message:"Paquete creado exitosamente"
				});
				return;
			}else{
				response.status(400).send({
					message:"Paquete no se creo, complete la informacion"
				});
				return;
			}
		} catch (error) {
			await client.query('ROLLBACK')
			response.status(400).send({
				message:"Error al crear paquete: "+error
			});
			return;
		}
	}


	const deletePaquete = (request,response) =>{
		let codigo = request.body.codigo;
		pool.query("DELETE FROM paquetes WHERE codigo=$1",[codigo],(error,results)=>{
		  if (error) {
			response.status(500)
				.send({
				  message: error
				});
			}else{
			  response.status(200).send({message:"Borrado exitosamente"});
			}
		})
	  }

	const getPaquetes = (request,response) =>{
		pool.query("SELECT * FROM paquetes",(error,results)=>{
		  if (error) {
			response.status(500)
				.send({
				  message: error
				});
			}else{
			  response.status(200).send({paquetes:results.rows});
			}
		})
	  }

	  const getProductosPaquete = (request,response) =>{
		let codigo = request.body.codigo;
		pool.query("SELECT pr.nombre,pr.codigo, pr.precio, pp.cantidad FROM paquetes pa INNER JOIN productos_paquete pp on pa.codigo=pp.codigo_paquete INNER JOIN productos pr on pr.codigo=pp.codigo_producto WHERE pa.codigo=$1",[codigo],(error,results)=>{
		  if (error) {
			response.status(500)
				.send({
				  message: error
				});
			}else{
				pool.query("SELECT  sum(pp.cantidad*pr.precio)  FROM paquetes pa INNER JOIN productos_paquete pp on pa.codigo=pp.codigo_paquete INNER JOIN productos pr on pr.codigo=pp.codigo_producto WHERE pa.codigo=$1",[codigo],(error,results2)=>{
					if (error) {
						response.status(500)
							.send({
							  message: error
							});}else{
								response.status(200).send({productos:results.rows,precio:results2.rows});
							}	
				});
			}
		})
	  }



	module.exports = {crearPaquete, getPaquetes, getProductosPaquete, actualizarPaquete, deletePaquete}