const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const productRoutes = require('./routes/productRoutes'); 
const adminRoutes = require('./routes/AdminRoutes');

// Iniciando servidor express
const app = express();
const PORT = process.env.PORT || 3000;

// Configurando middlewares
app.use(bodyParser.json());
app.use(cors());

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// Usar as rotas
app.use('/api', productRoutes);
app.use('/api', adminRoutes);

// Conexão com MongoDB


mongoose.connect('mongodb+srv://Gabriel:Gabriel1053@impermaq.ty4o9.mongodb.net/?retryWrites=true&w=majority&appName=impermaq', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// Verificação na conexão do MongoDB
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
    console.log('Connected to MongoDB'); 
});

// Inicializar servidor
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
