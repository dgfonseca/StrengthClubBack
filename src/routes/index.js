var express = require("express")
const db = require("../controller/auth.controller")
const entrenador = require("../controller/entrenador.controller")
const cliente = require("../controller/clientes.controller")
const middlewareAuth = require("../controller/middlewareAuth");
const productos = require("../controller/productos.controller")
const paquetes = require("../controller/paquetes.controller")
const sesiones = require("../controller/sesiones.controller")
const ventas = require("../controller/ventas.controller")
const contabilidad = require("../controller/contabilidad.controller")
router = express.Router();
router.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

router.post("/register", db.signup);
router.post("/login", db.signin);
/////CAJEROS DONE/////
router.get("/clientes",[middlewareAuth.validateToken,middlewareAuth.isCajero],cliente.getClientes)
router.get("/productosHabilitados",[middlewareAuth.validateToken,middlewareAuth.isCajero],productos.getProductosHabilitados)
router.get("/paquetes",[middlewareAuth.validateToken,middlewareAuth.isCajero],paquetes.getPaquetes)
router.get("/productos",[middlewareAuth.validateToken,middlewareAuth.isCajero],productos.getProductos)
router.post("/productosPaquete",[middlewareAuth.validateToken,middlewareAuth.isCajero], paquetes.getProductosPaquete)
router.post("/ventas",[middlewareAuth.validateToken,middlewareAuth.isCajero],ventas.registrarVentaProductos)
router.post("/registrarAbono",[middlewareAuth.validateToken,middlewareAuth.isCajero], cliente.postAbono)
router.get("/operaciones",[middlewareAuth.validateToken,middlewareAuth.isCajero,db.getOperacionesUsuarios])
/////ADMIN DONE/////
router.get("/usuarios",[middlewareAuth.validateToken,middlewareAuth.isAdmin], db.getUsuarios)
router.get("/ventas",[middlewareAuth.validateToken,middlewareAuth.isAdmin],ventas.getVentas)
router.get("/abonos",[middlewareAuth.validateToken,middlewareAuth.isAdmin],cliente.getAbonos)
router.get("/entrenadores",[middlewareAuth.validateToken,middlewareAuth.isAdmin],entrenador.getEntrenadores)
router.get("/sesiones",[middlewareAuth.validateToken,middlewareAuth.isAdmin],sesiones.getSesiones)
router.get("/contabilidadProductos",[middlewareAuth.validateToken,middlewareAuth.isAdmin], productos.getContabilidadProductos)
router.post("/abonosCliente",[middlewareAuth.validateToken,middlewareAuth.isAdmin], cliente.getAbonosCliente)
router.post("/detalleContabilidadCliente",[middlewareAuth.validateToken,middlewareAuth.isAdmin], cliente.getDetalleContabilidadCliente)
router.post("/entrenador",[middlewareAuth.validateToken,middlewareAuth.isAdmin],entrenador.crearEntrenador)
router.post("/cliente",[middlewareAuth.validateToken,middlewareAuth.isAdmin],cliente.crearCliente)
router.post("/productos",[middlewareAuth.validateToken,middlewareAuth.isAdmin],productos.crearProducto)
router.post("/paquetes",[middlewareAuth.validateToken,middlewareAuth.isAdmin],paquetes.crearPaquete)
router.post("/sesiones",[middlewareAuth.validateToken,middlewareAuth.isAdmin],sesiones.crearSesion)
router.post("/contenidoVentas",[middlewareAuth.validateToken,middlewareAuth.isAdmin],ventas.getContenidoVentas)
router.post("/ventasCliente", [middlewareAuth.validateToken,middlewareAuth.isAdmin],ventas.getVentasCliente)
router.put("/sesiones",[middlewareAuth.validateToken,middlewareAuth.isAdmin], sesiones.registrarAsistencia)
router.post("/contabilidadClientes",[middlewareAuth.validateToken,middlewareAuth.isAdmin],cliente.getContabilidadClientes)
router.put("/productos",[middlewareAuth.validateToken,middlewareAuth.isAdmin],productos.updateProducto)
router.put("/clientes",[middlewareAuth.validateToken,middlewareAuth.isAdmin],cliente.updateCliente)
router.put("/entrenadores",[middlewareAuth.validateToken,middlewareAuth.isAdmin],entrenador.updateEntrenador)
router.put("/paquetes",[middlewareAuth.validateToken,middlewareAuth.isAdmin],paquetes.actualizarPaquete)
router.put("/actualizarUsuario",[middlewareAuth.validateToken,middlewareAuth.isAdmin],db.actualizarUsuario)
router.delete("/productos",[middlewareAuth.validateToken,middlewareAuth.isAdmin],productos.deleteProductos)
router.delete("/clientes",[middlewareAuth.validateToken,middlewareAuth.isAdmin], cliente.deleteClientes)
router.delete("/entrenadores",[middlewareAuth.validateToken,middlewareAuth.isAdmin],entrenador.deleteEntrenadores)
router.delete("/paquete",[middlewareAuth.validateToken,middlewareAuth.isAdmin],paquetes.deletePaquete)
router.delete("/sesiones",[middlewareAuth.validateToken,middlewareAuth.isAdmin],sesiones.desagendarSesion)
router.delete("/venta",[middlewareAuth.validateToken,middlewareAuth.isAdmin],ventas.eliminarVenta)
router.delete("/abono",[middlewareAuth.validateToken,middlewareAuth.isAdmin],cliente.deleteAbono)
router.delete("/sesionesEntrenador",[middlewareAuth.validateToken,middlewareAuth.isAdmin],sesiones.borrarSesionesEntrenador)
////ADMIN TODO/////
router.post("/sendEmail",[middlewareAuth.validateToken,middlewareAuth.isAdmin],cliente.sendEmail)
router.post("/sesionesics",[middlewareAuth.validateToken,middlewareAuth.isAdmin],sesiones.crearSesionDeIcs)
router.post("/contabilidadSesiones",[middlewareAuth.validateToken,middlewareAuth.isAdmin],contabilidad.contabilidadSesiones)

module.exports = router;
