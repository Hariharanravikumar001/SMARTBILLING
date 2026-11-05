'use strict';

const express = require('express');
const router = express.Router();
const { get, run, all } = require('../db');
const { requireBusinessAuth } = require('../middleware/auth');
const zohoService = require('../services/zohoService');

/**
 * Public SaaS Demo Request Endpoint (Captures lead into Zoho CRM)
 */
router.post('/demo-request', async (req, res) => {
  const { name, email, phone, businessName, industry, notes } = req.body;
  if (!name || !email || !phone || !businessName) {
    return res.status(400).json({ success: false, message: 'Name, email, phone, and business name are required.' });
  }

  try {
    const result = await zohoService.syncDemoRequestAsLead({
      name,
      email,
      phone,
      businessName,
      industry,
      notes
    });

    res.status(201).json({
      success: true,
      message: 'Demo request received! Our solution specialist will connect shortly.',
      data: result
    });
  } catch (err) {
    console.error('[Zoho Demo Request Error]:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Shopkeeper In-App Helpdesk & Zoho Desk Support
 */
router.get('/tickets', requireBusinessAuth, (req, res) => {
  const tickets = all(`
    SELECT * FROM support_tickets
    WHERE business_id = ?
    ORDER BY created_at DESC
  `, [req.businessId]);

  const formatted = tickets.map(t => ({
    ...t,
    replies: t.replies_json ? JSON.parse(t.replies_json) : []
  }));

  res.json({ success: true, data: formatted });
});

router.post('/tickets', requireBusinessAuth, async (req, res) => {
  const { category, priority = 'Medium', subject, description } = req.body;
  if (!category || !subject || !description) {
    return res.status(400).json({ success: false, message: 'Category, subject, and description are required.' });
  }

  try {
    const result = await zohoService.createSupportTicket({
      businessId: req.businessId,
      businessName: req.business.name,
      category,
      priority,
      subject,
      description,
      customerEmail: req.business.email
    });

    res.status(201).json({
      success: true,
      message: 'Support ticket submitted successfully.',
      data: result
    });
  } catch (err) {
    console.error('[Support Ticket Error]:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/tickets/:id/reply', requireBusinessAuth, (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ success: false, message: 'Message text is required.' });
  }

  try {
    const result = zohoService.addTicketReply({
      ticketId: req.params.id,
      sender: req.user.name,
      senderType: 'CUSTOMER',
      message
    });

    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post('/tickets/:id/rate', requireBusinessAuth, (req, res) => {
  const { rating, comment } = req.body;
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ success: false, message: 'Rating must be an integer between 1 and 5.' });
  }

  const result = zohoService.rateTicket({
    ticketId: req.params.id,
    rating: parseInt(rating, 10),
    comment: comment || ''
  });

  res.json({ success: true, message: 'Thank you for your rating!', result });
});

module.exports = router;
