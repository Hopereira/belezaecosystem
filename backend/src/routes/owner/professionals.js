/**
 * Owner Professionals Routes
 * Simple listing of professionals scoped by tenant_id
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth');
const tenantFromJWT = require('../../middleware/tenantFromJWT');
const { Professional, User } = require('../../models');

router.use(authenticate);
router.use(tenantFromJWT);
router.use(authorize('owner', 'admin', 'professional'));

// GET /api/professionals - List professionals for tenant
router.get('/', async (req, res) => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      return res.status(403).json({ success: false, message: 'Tenant not found' });
    }

    const professionals = await Professional.findAll({
      where: { tenant_id: tenantId },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'first_name', 'last_name', 'email', 'phone'],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    // Map to friendly format
    const data = professionals.map(p => {
      const plain = p.toJSON();
      return {
        id: plain.id,
        user_id: plain.user_id,
        name: plain.user ? `${plain.user.first_name || ''} ${plain.user.last_name || ''}`.trim() : (plain.specialty || 'Profissional'),
        email: plain.user?.email,
        phone: plain.user?.phone,
        specialty: plain.specialty,
        commission_rate: plain.commission_rate,
      };
    });

    return res.json({ success: true, data });
  } catch (error) {
    console.error('[Professionals] List error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
