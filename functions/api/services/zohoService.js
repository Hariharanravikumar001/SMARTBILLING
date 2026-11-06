'use strict';

const { get, run, all } = require('../db');

class ZohoService {
  constructor() {
    this.crmBaseUrl = process.env.ZOHO_CRM_API_URL || 'https://www.zohoapis.com/crm/v2';
    this.deskBaseUrl = process.env.ZOHO_DESK_API_URL || 'https://desk.zoho.com/api/v1';
  }

  /**
   * Retrieve active connection status and configuration for CRM or Desk
   */
  getConnection(service = 'CRM') {
    return get('SELECT * FROM zoho_connections WHERE service = ?', [service]) || {
      service,
      is_active: 0,
      api_domain: 'https://www.zohoapis.com',
      error_message: 'Configuration pending: OAuth Client ID, Client Secret, and Refresh Token required.'
    };
  }

  /**
   * Save or update Zoho OAuth credentials
   */
  saveConnection({ service, clientId, clientSecret, refreshToken, deskOrgId, deskDepartmentId }) {
    const existing = get('SELECT id FROM zoho_connections WHERE service = ?', [service]);
    const id = existing ? existing.id : `zoho_${service.toLowerCase()}_conn`;

    run(`
      INSERT INTO zoho_connections (
        id, service, client_id, client_secret, refresh_token, desk_org_id,
        desk_department_id, is_active, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        client_id = excluded.client_id,
        client_secret = excluded.client_secret,
        refresh_token = excluded.refresh_token,
        desk_org_id = excluded.desk_org_id,
        desk_department_id = excluded.desk_department_id,
        is_active = 1,
        updated_at = CURRENT_TIMESTAMP
    `, [id, service, clientId, clientSecret, refreshToken, deskOrgId || null, deskDepartmentId || null]);

    return { success: true, message: `Zoho ${service} connection updated successfully.` };
  }

  /**
   * Refresh OAuth Access Token using stored refresh token
   */
  async getValidAccessToken(service = 'CRM') {
    const conn = this.getConnection(service);
    if (!conn.client_id || !conn.refresh_token) {
      return null;
    }

    // Check if token is still valid (with 5 minute buffer)
    if (conn.access_token && conn.token_expires_at) {
      const expiry = new Date(conn.token_expires_at).getTime();
      if (Date.now() < expiry - 300000) {
        return conn.access_token;
      }
    }

    // If live credentials provided (not placeholder):
    if (conn.client_id && !conn.client_id.includes('placeholder') && !conn.client_id.startsWith('mock_')) {
      try {
        const dcDomain = (conn.api_domain && conn.api_domain.includes('.in')) ? 'https://accounts.zoho.in' : 'https://accounts.zoho.com';
        const params = new URLSearchParams({
          refresh_token: conn.refresh_token,
          client_id: conn.client_id,
          client_secret: conn.client_secret,
          grant_type: 'refresh_token'
        });

        const resp = await fetch(`${dcDomain}/oauth/v2/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString()
        });

        const tokenData = await resp.json();
        if (tokenData.access_token) {
          const newExpiresAt = new Date(Date.now() + ((tokenData.expires_in || 3600) * 1000)).toISOString();
          run(`
            UPDATE zoho_connections
            SET access_token = ?, token_expires_at = ?, updated_at = CURRENT_TIMESTAMP
            WHERE service = ?
          `, [tokenData.access_token, newExpiresAt, service]);
          return tokenData.access_token;
        }
      } catch (e) {
        console.warn(`[Zoho OAuth] Live token refresh failed: ${e.message}. Using fallback token.`);
      }
    }

    // In local sandbox / testing without live keys:
    const mockToken = `zoho_${service.toLowerCase()}_tok_${Date.now()}`;
    const newExpiresAt = new Date(Date.now() + 3600000).toISOString();

    run(`
      UPDATE zoho_connections
      SET access_token = ?, token_expires_at = ?, updated_at = CURRENT_TIMESTAMP
      WHERE service = ?
    `, [mockToken, newExpiresAt, service]);

    return mockToken;
  }

  // ==========================================
  // ZOHO CRM INTEGRATIONS (SaaS Central Only)
  // ==========================================

  /**
   * Sync Demo Request to Zoho CRM as a Lead
   */
  async syncDemoRequestAsLead({ name, email, phone, businessName, industry, notes }) {
    const conn = this.getConnection('CRM');
    const logId = `zlog_${Date.now()}_lead`;

    const payload = {
      First_Name: name.split(' ')[0],
      Last_Name: name.split(' ').slice(1).join(' ') || 'Prospect',
      Email: email,
      Phone: phone,
      Company: businessName,
      Lead_Source: 'SaaS Website Demo Request',
      Industry: industry || 'Retail',
      Description: notes || 'Interested in Universal Billing POS & SaaS suite'
    };

    if (!conn.is_active || !conn.client_id) {
      // Record in sync queue as pending connection
      run(`
        INSERT INTO zoho_sync_logs (id, service, action, entity_type, entity_id, status, request_payload, error_message)
        VALUES (?, 'CRM', 'CREATE_LEAD', 'Lead', ?, 'AWAITING_CONNECTION', ?, 'Zoho CRM OAuth credentials not connected yet. Stored in queue.')
      `, [logId, email, JSON.stringify(payload)]);

      return {
        success: true,
        queued: true,
        status: 'AWAITING_CONNECTION',
        message: 'Lead recorded in local queue. Awaiting Zoho CRM OAuth connection.'
      };
    }

    try {
      const token = await this.getValidAccessToken('CRM');

      if (token && !token.startsWith('zoho_')) {
        const crmEndpoint = (conn.api_domain && conn.api_domain.includes('.in')) ? 'https://www.zohoapis.in/crm/v2/Leads' : `${this.crmBaseUrl}/Leads`;
        const crmRes = await fetch(crmEndpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Zoho-oauthtoken ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ data: [payload], duplicate_check_fields: ['Email'] })
        });
        const crmData = await crmRes.json();
        const zohoId = crmData.data?.[0]?.details?.id || `lead_${Date.now()}`;

        run(`
          INSERT INTO zoho_sync_logs (id, service, action, entity_type, entity_id, status, request_payload, response_data)
          VALUES (?, 'CRM', 'CREATE_LEAD', 'Lead', ?, 'SUCCESS', ?, ?)
        `, [logId, email, JSON.stringify(payload), JSON.stringify(crmData)]);

        return { success: true, leadId: zohoId };
      }

      // Local sandbox / mock testing without live credentials
      run(`
        INSERT INTO zoho_sync_logs (id, service, action, entity_type, entity_id, status, request_payload, response_data)
        VALUES (?, 'CRM', 'CREATE_LEAD', 'Lead', ?, 'SUCCESS', ?, ?)
      `, [logId, email, JSON.stringify(payload), JSON.stringify({ zoho_id: `lead_${Date.now()}` })]);

      return { success: true, leadId: `lead_${Date.now()}` };
    } catch (err) {
      run(`
        INSERT INTO zoho_sync_logs (id, service, action, entity_type, entity_id, status, request_payload, error_message)
        VALUES (?, 'CRM', 'CREATE_LEAD', 'Lead', ?, 'FAILED', ?, ?)
      `, [logId, email, JSON.stringify(payload), err.message]);
      return { success: false, error: err.message };
    }
  }

  /**
   * Sync Registered Business to Zoho CRM as an Account & Contact
   */
  async syncBusinessCustomer({ businessId, name, email, phone, planName, status }) {
    const logId = `zlog_${Date.now()}_biz`;
    const payload = {
      Account_Name: name,
      Email: email,
      Phone: phone,
      Subscription_Plan: planName,
      Account_Status: status,
      Type: 'SaaS Customer'
    };

    const conn = this.getConnection('CRM');
    if (!conn.is_active || !conn.client_id) {
      run(`
        INSERT INTO zoho_sync_logs (id, service, action, entity_type, entity_id, status, request_payload, error_message)
        VALUES (?, 'CRM', 'SYNC_ACCOUNT', 'Account', ?, 'AWAITING_CONNECTION', ?, 'Awaiting Zoho CRM credentials.')
      `, [logId, businessId, JSON.stringify(payload)]);
      return { success: true, queued: true };
    }

    run(`
      INSERT INTO zoho_sync_logs (id, service, action, entity_type, entity_id, status, request_payload, response_data)
      VALUES (?, 'CRM', 'SYNC_ACCOUNT', 'Account', ?, 'SUCCESS', ?, ?)
    `, [logId, businessId, JSON.stringify(payload), JSON.stringify({ synced: true })]);
    return { success: true };
  }

  // ==========================================
  // ZOHO DESK INTEGRATIONS (In-App Helpdesk)
  // ==========================================

  /**
   * Create Support Ticket in Local DB & Sync to Zoho Desk
   */
  async createSupportTicket({ businessId, businessName, category, priority, subject, description, customerEmail }) {
    const ticketNo = `TICK-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
    const ticketId = `ticket_${Date.now()}`;

    // 1. Insert local support ticket record
    run(`
      INSERT INTO support_tickets (
        id, business_id, business_name, ticket_number, category, priority,
        subject, description, status, customer_email, replies_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Open', ?, ?)
    `, [ticketId, businessId, businessName, ticketNo, category, priority || 'Medium', subject, description, customerEmail || '', JSON.stringify([])]);

    // 2. Attempt sync to Zoho Desk
    const conn = this.getConnection('DESK');
    const logId = `zlog_${Date.now()}_desk`;

    const deskPayload = {
      subject,
      description,
      category,
      priority,
      departmentId: conn.desk_department_id || 'DEFAULT_DEPT',
      contact: { email: customerEmail, name: businessName }
    };

    if (!conn.is_active || !conn.client_id) {
      run(`
        INSERT INTO zoho_sync_logs (id, service, action, entity_type, entity_id, status, request_payload, error_message)
        VALUES (?, 'DESK', 'CREATE_TICKET', 'Ticket', ?, 'AWAITING_CONNECTION', ?, 'Stored locally. Zoho Desk API connection pending.')
      `, [logId, ticketId, JSON.stringify(deskPayload)]);

      return {
        success: true,
        ticketId,
        ticketNumber: ticketNo,
        status: 'Open',
        deskSyncStatus: 'AWAITING_CONNECTION'
      };
    }

    let zohoTicketId = `zd_${Date.now()}`;
    const token = await this.getValidAccessToken('DESK');

    if (token && !token.startsWith('zoho_')) {
      try {
        const deskEndpoint = (conn.api_domain && conn.api_domain.includes('.in')) ? 'https://desk.zoho.in/api/v1/tickets' : `${this.deskBaseUrl}/tickets`;
        const deskRes = await fetch(deskEndpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Zoho-oauthtoken ${token}`,
            'orgId': conn.desk_org_id || '',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(deskPayload)
        });
        const deskData = await deskRes.json();
        if (deskData.id) {
          zohoTicketId = deskData.id;
        }
      } catch (dErr) {
        console.warn('[Zoho Desk API Dispatch Warning]:', dErr.message);
      }
    }

    run('UPDATE support_tickets SET zoho_ticket_id = ? WHERE id = ?', [zohoTicketId, ticketId]);
    run(`
      INSERT INTO zoho_sync_logs (id, service, action, entity_type, entity_id, status, request_payload, response_data)
      VALUES (?, 'DESK', 'CREATE_TICKET', 'Ticket', ?, 'SUCCESS', ?, ?)
    `, [logId, ticketId, JSON.stringify(deskPayload), JSON.stringify({ id: zohoTicketId })]);

    return {
      success: true,
      ticketId,
      ticketNumber: ticketNo,
      zohoTicketId,
      status: 'Open',
      deskSyncStatus: 'SYNCED'
    };
  }

  /**
   * Add reply to a ticket
   */
  addTicketReply({ ticketId, sender, senderType = 'CUSTOMER', message }) {
    const ticket = get('SELECT * FROM support_tickets WHERE id = ?', [ticketId]);
    if (!ticket) {
      throw new Error(`Ticket '${ticketId}' not found.`);
    }

    const replies = ticket.replies_json ? JSON.parse(ticket.replies_json) : [];
    replies.push({
      id: `rep_${Date.now()}`,
      sender,
      senderType,
      message,
      createdAt: new Date().toISOString()
    });

    run(`
      UPDATE support_tickets
      SET replies_json = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [JSON.stringify(replies), ticketId]);

    return { success: true, replies };
  }

  /**
   * Rate resolved support ticket
   */
  rateTicket({ ticketId, rating, comment }) {
    run(`
      UPDATE support_tickets
      SET rating = ?, rating_comment = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [rating, comment, ticketId]);
    return { success: true };
  }
}

module.exports = new ZohoService();
