const express = require('express');
const multer = require('multer');
const router = express.Router();
const Product = require('../models/Product');
const cloudinary = require('cloudinary').v2;

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
            productData.images = await Promise.all(uploadPromises);
        }

        const product = new Product(productData);
        await product.save();
        res.status(201).send(product);
    } catch (error) {
        console.error('Erro ao criar produto:', error);
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
router.put('/products/:id', upload.array('images', 10), async (req, res) => {
    try {
        const productData = req.body;

        // Obter o produto existente
        const existingProduct = await Product.findById(req.params.id);

        if (!existingProduct) {
            return res.status(404).send({ error: 'Product not found' });
        }

        console.log('=== INÍCIO DA ATUALIZAÇÃO ===');
        console.log('Produto existente:', existingProduct.name);
        console.log('Imagens existentes no produto:', existingProduct.images);

        // 1. PARSEAR as imagens existentes que devem ser mantidas
        let existingImages = [];
        if (productData.existingImages) {
            try {
                existingImages = JSON.parse(productData.existingImages);
                console.log('Imagens existentes a manter (do frontend):', existingImages);
            } catch (e) {
                console.error('Erro ao parsear existingImages:', e);
            }
        }

        // 2. PARSEAR as imagens que devem ser removidas
        let imagesToRemove = [];
        if (productData.imagesToRemove) {
            try {
                imagesToRemove = JSON.parse(productData.imagesToRemove);
                console.log('Imagens a remover:', imagesToRemove);
            } catch (e) {
                console.error('Erro ao parsear imagesToRemove:', e);
            }
        }

        // 3. FAZER UPLOAD das novas imagens
        let newImageUrls = [];
        if (req.files && req.files.length > 0) {
            console.log('Fazendo upload de', req.files.length, 'novas imagens...');
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
            console.log('Novas imagens carregadas:', newImageUrls);
        }

        // 4. DELETAR imagens removidas do Cloudinary
        if (imagesToRemove.length > 0) {
            console.log('Deletando imagens do Cloudinary...');
            const deletePromises = imagesToRemove.map(async (imageUrl) => {
                try {
                    // Extrair public_id da URL do Cloudinary
                    const urlParts = imageUrl.split('/');
                    const publicIdWithExtension = urlParts[urlParts.length - 1];
                    const publicId = publicIdWithExtension.split('.')[0];
                    
                    console.log('Deletando imagem:', publicId);
                    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
                } catch (err) {
                    console.error(`Erro ao deletar imagem do Cloudinary:`, err);
                }
            });
            await Promise.all(deletePromises);
        }

        // 5. COMBINAR todas as imagens: existentes + novas
        const updatedImages = [...existingImages, ...newImageUrls];
        console.log('Array final de imagens:', updatedImages);

        // 6. REMOVER os campos de controle antes de atualizar
        delete productData.existingImages;
        delete productData.imagesToRemove;

        // 7. ATUALIZAR o produto
        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            { 
                ...productData, 
                images: updatedImages 
            },
            { new: true }
        );

        console.log('Produto atualizado com sucesso!');
        console.log('Total de imagens após atualização:', updatedProduct.images.length);
        console.log('=== FIM DA ATUALIZAÇÃO ===');

        res.status(200).send(updatedProduct);
    } catch (error) {
        console.error('Erro ao atualizar produto:', error);
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
                try {
                    const urlParts = imageUrl.split('/');
                    const publicIdWithExtension = urlParts[urlParts.length - 1];
                    const publicId = publicIdWithExtension.split('.')[0];
                    
                    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
                } catch (err) {
                    console.error(`Erro ao deletar imagem no Cloudinary:`, err);
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
