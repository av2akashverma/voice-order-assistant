// server.js
// Entry point only. All real logic lives in routes/, services/, and models/.
// This file's only job is: load config, set up middleware, mount routes, listen.

require('dotenv').config();

const express = require('express');
const path = require('path');
const orderRoutes = require('./routes/orderRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api', orderRoutes);

app.listen(PORT, () => {
  console.log(`Voice Order Assistant running on http://localhost:${PORT}`);
});
