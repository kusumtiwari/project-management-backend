const app = require('./app');
const mongoose = require("mongoose");
require('dotenv').config();

const PORT = process.env.PORT
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));
app.listen(PORT, () => {
    console.log('server running at port', PORT)
})