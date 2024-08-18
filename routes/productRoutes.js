const express = require('express');
const multer = require('multer');
const router = express.Router();
const Product = require('../models/Product');
const path = require('path');
const fs = require('fs');

// Caminho para o diretório de uploads
const uploadDir = path.join(__dirname, '../uploads');

// Garantir que o diretório de uploads existe
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuração do multer para armazenamento de arquivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// CREATE - Criar um novo produto
router.post('/products', upload.array('images', 5), async (req, res) => {
    try {
        console.log(req.body); // Verifique se condition está presente
        const productData = req.body;
        if (req.files) {
            productData.images = req.files.map(file => `/uploads/${file.filename}`); // Salvar caminhos das imagens
        }
        const product = new Product(productData);
        await product.save();
        res.status(201).send(product);
    } catch (error) {
        console.error(error); // Log de erro para debug
        res.status(500).send({ error: 'Failed to create product', details: error.message });
    }
});

// READ - Obter todos os produtos
router.get('/products', async (req, res) => {
    try {
        const products = await Product.find({});
        res.status(200).send(products);
    } catch (error) {
        res.status(500).send(error);
    }
});

// READ - Obter um produto pelo ID
router.get('/products/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Produto não encontrado' });
        }
        res.status(200).json(product);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro no servidor', error });
    }
});



// UPDATE - Atualizar um produto pelo ID
router.put('/products/:id', upload.array('images', 5), async (req, res) => {
    try {
        const productData = req.body;

        // Obter o produto existente
        const existingProduct = await Product.findById(req.params.id);

        if (!existingProduct) {
            return res.status(404).send({ error: 'Product not found' });
        }

        // Atualizar imagens
        if (req.files && req.files.length > 0) {
            const newImagePaths = req.files.map(file => `/uploads/${file.filename}`);

            // Combinar as novas imagens com as existentes
            productData.images = [...existingProduct.images, ...newImagePaths];

            // Garantir que a primeira imagem continue sendo a principal
            if (req.body.keepExistingMainImage === 'false') {
                productData.images = [...newImagePaths, ...existingProduct.images];
            }
        } else {
            // Manter as imagens antigas se nenhuma nova imagem foi enviada
            productData.images = existingProduct.images;
        }

        // Atualizar o produto no banco de dados
        const updatedProduct = await Product.findByIdAndUpdate(req.params.id, productData, { new: true });

        res.status(200).send(updatedProduct);
    } catch (error) {
        console.error(error); // Log de erro para debug
        res.status(500).send({ error: 'Failed to update product', details: error.message });
    }
});


// DELETE - Deletar um produto pelo ID
router.delete('/products/:id', async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);

        if (!product) {
            return res.status(404).send({ message: 'Produto não encontrado' });
        }

        // Excluir as imagens do produto
        if (product.image && product.image.length > 0) {
            const deletePromises = product.image.map(async (imagePath) => {
                const fullImagePath = path.join(__dirname, '../uploads', imagePath);
                try {
                    await fs.promises.unlink(fullImagePath);
                } catch (err) {
                    console.error(`Erro ao deletar a imagem: ${fullImagePath}`, err);
                }
            });
            await Promise.all(deletePromises);
        }

        res.status(200).send({ message: 'Produto e imagens deletados com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar o produto:', error);
        res.status(500).send({ message: 'Erro interno no servidor' });
    }
});

module.exports = router;
