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
router.delete("/sesiones",sesiones.desagendarSesion)
router.put("/sesiones", sesiones.registrarAsistencia)
router.get("/clientes",cliente.getClientes)
router.get("/entrenadores",entrenador.getEntrenadores)
router.get("/sesiones",sesiones.getSesiones)
router.get("/productos",productos.getProductos)
router.post("/ventas",ventas.registrarVentaProductos)
router.get("/paquetes",paquetes.getPaquetes)

module.exports = router;
