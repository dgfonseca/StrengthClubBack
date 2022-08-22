var express = require("express")
const db = require("../controller/auth.controller")
const entrenador = require("../controller/entrenador.controller")
const cliente = require("../controller/clientes.controller")
const validateToken = require("../controller/middlewareAuth");
const productos = require("../controller/productos.controller")
const paquetes = require("../controller/paquetes.controller")
const sesiones = require("../controller/sesiones.controller")
const ventas = require("../controller/ventas.controller")
router = express.Router();



router.post("/register", db.signup);

router.post("/login", db.signin);
// router.post("/entrenador",validateToken.validateToken,entrenador.crearEntrenador)
router.post("/entrenador",entrenador.crearEntrenador)
// router.post("/cliente",validateToken.validateToken,cliente.crearCliente)
router.post("/cliente",cliente.crearCliente)
router.post("/productos",productos.crearProducto)
router.post("/paquetes",paquetes.crearPaquete)
router.post("/sesiones",sesiones.crearSesion)
router.post("/sesionesics",sesiones.crearSesionDeIcs)
router.post("/ventas",ventas.registrarVentaProductos)
router.post("/contenidoVentas",ventas.getContenidoVentas)
router.post("/productosPaquete", paquetes.getProductosPaquete)
router.post("/ventasCliente", ventas.getVentasCliente)
router.put("/sesiones", sesiones.registrarAsistencia)
router.put("/registrarAbono", cliente.postAbono)
router.get("/clientes",cliente.getClientes)
router.get("/contabilidadClientes",cliente.getContabilidadClientes)
router.get("/ventas",ventas.getVentas)
router.get("/entrenadores",entrenador.getEntrenadores)
router.get("/sesiones",sesiones.getSesiones)
router.get("/productos",productos.getProductos)
router.get("/productosHabilitados",productos.getProductosHabilitados)
router.get("/paquetes",paquetes.getPaquetes)
router.get("/usuarios", db.getUsuarios)
router.get("/contabilidadProductos", productos.getContabilidadProductos)
router.put("/productos",productos.updateProducto)
router.put("/clientes",cliente.updateCliente)
router.put("/contabilidadClientes",cliente.updateCliente)
router.put("/entrenadores",entrenador.updateEntrenador)
router.put("/paquetes",paquetes.actualizarPaquete)
router.delete("/productos",productos.deleteProductos)
router.delete("/clientes", cliente.deleteClientes)
router.delete("/entrenadores",entrenador.deleteEntrenadores)
router.delete("/paquete",paquetes.deletePaquete)
router.delete("/sesiones",sesiones.desagendarSesion)
router.delete("/venta",ventas.eliminarVenta)

module.exports = router;
