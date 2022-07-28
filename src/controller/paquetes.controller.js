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

	const actualizarPaquete = async (request, response) => {
		const client = await pool.connect()
		try {
			let codigoPaquete = request.body.codigo;
			let nombre = request.body.nombre;
			let productos = request.body.productos;
			let precio = request.body.precio;
			await client.query('BEGIN');
			await client.query('DELETE FROM paquetes WHERE codigo=$1',[codigoPaquete]);
			await client.query("INSERT INTO paquetes(codigo,precio,nombre) VALUES($1,$2,$3)",[codigoPaquete,precio,nombre]);
			for (let producto of productos) {
				let codigo = producto.codigo;
				let cantidad = producto.cantidad;
				await client.query("INSERT INTO productos_paquete(codigo_producto,codigo_paquete,cantidad) VALUES($1,$2,$3)",[codigo,codigoPaquete,cantidad]);
			}
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

	// const crearPaquete = (request, response) => {
	// 	let codigoPaquete = request.body.codigo;
	// 	let nombre = request.body.nombre;
	// 	let productos = request.body.productos;
	// 	let precio = request.body.precio;
	// 	pool.connect((err, client, done)=>{
	// 		let hayError = false;
	// 		const shouldAbort = (err) => {
	// 			if (err) {
	// 			hayError=true;
	// 			client.query('ROLLBACK', err2 => {
	// 				if (err2) {
	// 					console.log("Error al hacer rollback")
	// 				}
	// 			})
	// 				return true;
	// 			}
	// 			else{
	// 				return false;
	// 			}
	// 		}

	// 	if(nombre && productos && precio && codigoPaquete){
	// 		client.query("BEGIN", (error)=>{
	// 		if (shouldAbort(error)) {
	// 				response.status(400).send({
	// 				message:"Error al crear paquete"
	// 			});
	// 				done();
	// 				return;
	// 			}else{
	// 				client.query("INSERT INTO paquetes(codigo,precio,nombre) VALUES($1,$2,$3)",[codigoPaquete,precio,nombre], (error2)=>{
	// 					if (shouldAbort(error2)) {
	// 						hayError=true;
	// 						response.status(400).send({
	// 							message:"Error al crear paquete"
	// 						});
	// 						done();
	// 						return;
							                    
	// 					}else{
	// 						productos.forEach(producto => {
	// 						let codigo = producto.codigo;
	// 						let cantidad = producto.cantidad;
	// 						client.query("INSERT INTO productos_paquete(codigo_producto,codigo_paquete,cantidad) VALUES($1,$2,$3)",[codigo,codigoPaquete,cantidad],(error3)=>{
	// 							if (shouldAbort(error3)) {
	// 								hayError=true;
	// 								return;                        
	// 								} 
	// 							})
	// 						});
	// 						if(!hayError){
	// 							client.query("COMMIT", (error4)=>{
	// 							if (shouldAbort(error4)) {
	// 									hayError=true;                      
	// 								}
	// 								response.status(200).send({
	// 									message:"Paquete creado exitosamente"
	// 								});
	// 								return;
	// 							});  
	// 							done()
	// 							return;						
	// 						}else{
	// 							shouldAbort(true);
	// 							response.status(400).send({
	// 								message:"Error al crear paquete"
	// 							});
	// 							done()
	// 							return;	 
	// 					}
	// 				}
	// 				});
				
	// 			}
	// 		});
	// 	}else{
	// 		done()
	// 		response.status(400).json({message:"Campos Faltantes"});
	// 	}
	// 	});   
	// };

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