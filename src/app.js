const express = require('express');
const app = express();
const cors = require('cors');

app.use(cors());
app.use(express.json());

const indexRoutes = require('./routes/index');
const authRoutes = require('./routes/auth')
app.use("/api", indexRoutes);
app.use("/api/auth", authRoutes); 

module.exports = app;