const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');

// CREATE - Criar dados do Admin (se necessário)
router.post('/admin', async (req, res) => {
    try {
        const admin = new Admin(req.body);
        await admin.save();
        res.status(201).send(admin);
    } catch (error) {
        res.status(400).send(error);
    }
});

// READ - Obter dados do Admin
router.get('/admin', async (req, res) => {
    try {
        const admin = await Admin.findOne();
        res.status(200).send(admin);
    } catch (error) {
        res.status(500).send(error);
    }
});

// UPDATE - Atualizar dados do Admin
router.put('/admin', async (req, res) => {
    try {
        const admin = await Admin.findOne();
        if (!admin) {
            return res.status(404).send({ message: 'Admin not found' });
        }
        
        admin.email = req.body.email || admin.email;
        admin.telefone = req.body.telefone || admin.telefone;
        admin.sobre = req.body.sobre || admin.sobre;
        
        await admin.save();
        
        res.status(200).send(admin);
    } catch (error) {
        res.status(500).send({ message: 'Failed to update admin', error });
    }
});

module.exports = router;
