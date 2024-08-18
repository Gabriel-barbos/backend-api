const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema({
    email: { type: String, required: true },
    telefone: { type: String, required: true },
    sobre: { type: String, required: true }
});

module.exports = mongoose.model('Admin', AdminSchema);

