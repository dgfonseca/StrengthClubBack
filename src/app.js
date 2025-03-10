var express = require('express');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
userRoutes = require("./routes/index");
const cors = require('cors');
require("dotenv").config();

var indexRouter = require('./routes/index');

var app = express();



app.use(cors({origin:'*',allowedHeaders:['*']}));
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({
  extended: true
}));app.use(cookieParser());

app.use('/', indexRouter);
app.use(userRoutes);

module.exports = app;
