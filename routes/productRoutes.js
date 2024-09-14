const express = require('express');
const multer = require('multer');
const router = express.Router();
const Product = require('../models/Product');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');

// Configuração do multer para armazenamento de arquivos em memória temporária
const storage = multer.memoryStorage();
const upload = multer({ storage });

// CREATE - Criar um novo produto
router.post('/products', upload.array('images', 10), async (req, res) => {
    try {
        const productData = req.body;
        
        if (req.files && req.files.length > 0) {
            const uploadPromises = req.files.map(file => {
                return new Promise((resolve, reject) => {
                    cloudinary.uploader.upload_stream({ resource_type: 'image' }, (error, result) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(result.secure_url);
                        }
                    }).end(file.buffer);
                });
            });
            productData.images = await Promise.all(uploadPromises); // Salvar URLs das imagens no Cloudinary
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

        // Processar novas imagens
        let newImageUrls = [];
        if (req.files && req.files.length > 0) {
            const uploadPromises = req.files.map(file => {
                return new Promise((resolve, reject) => {
                    cloudinary.uploader.upload_stream({ resource_type: 'image' }, (error, result) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(result.secure_url);
                        }
                    }).end(file.buffer);
                });
            });
            newImageUrls = await Promise.all(uploadPromises);
        }

        // Verificar se o usuário deseja manter a imagem principal existente
        const keepExistingMainImage = req.body.keepExistingMainImage === 'true';

        // Atualizar imagens
        let updatedImages = [];
        if (keepExistingMainImage) {
            // Manter a primeira imagem existente e adicionar novas imagens
            updatedImages = [existingProduct.images[0], ...newImageUrls];
            // Adicionar as novas imagens, excluindo a primeira imagem existente para evitar duplicação
            updatedImages = [...updatedImages, ...newImageUrls];
        } else {
            // Usar apenas novas imagens se não manter a imagem principal
            updatedImages = newImageUrls;
        }

        // Atualizar o produto com novas informações
        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            { ...productData, images: updatedImages },
            { new: true }
        );

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

        // Excluir as imagens do produto no Cloudinary
        if (product.images && product.images.length > 0) {
            const deletePromises = product.images.map(async (imageUrl) => {
                const publicId = imageUrl.split('/').pop().split('.')[0]; // Extraindo o public_id do URL da imagem
                try {
                    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
                } catch (err) {
                    console.error(`Erro ao deletar a imagem no Cloudinary: ${publicId}`, err);
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
