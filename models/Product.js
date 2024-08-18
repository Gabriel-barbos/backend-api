const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true },
    images: { type: [String], required: true },
    description: { type: String, required: true },
    specifications: { type: String, required: true },
    accessories: { type: String, required: true },
    condition: { type: String, enum: ['Novo', 'Usado'], required: true },  // Adicionando o campo "condition"
});

module.exports = mongoose.model('Product', ProductSchema);
