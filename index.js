const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const productRoutes = require('./routes/productRoutes'); 
const adminRoutes = require('./routes/AdminRoutes');
const cloudinary = require('cloudinary').v2;

//cloudinary config
cloudinary.config({ 
    cloud_name: 'dcafl8a98',
    api_key: '171669338822128', 
    api_secret: 'gTcQsvAnR2ubk0g32LG7fNIFYfU',
    secure:true
});

cloudinary.uploader.upload

// Iniciando servidor express
const app = express();
const PORT = process.env.PORT || 3000;

// Configurando middlewares
app.use(bodyParser.json());
app.use(cors());


// Usar as rotas
app.use('/api', productRoutes);
app.use('/api', adminRoutes);

// Conexão com MongoDB

const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://Gabriel:Gabriel1053@impermaq.ty4o9.mongodb.net/?retryWrites=true&w=majority&appName=impermaq';

mongoose.connect(mongoURI, {
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
