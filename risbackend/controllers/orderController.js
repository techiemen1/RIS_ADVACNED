const orderService = require('../services/orderService');
const { logAction } = require('./auditController');

exports.createOrder = async (req, res) => {
  try {
    const order = await orderService.createOrder({
      ...req.body,
      ordering_physician: req.user?.username || 'system'
    });
    
    await logAction(
      req.user?.username || 'system',
      req.user?.role || 'staff',
      `Created imaging order ACC: ${order.accession_number} for patient ID ${order.patient_id}`
    );

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order
    });
  } catch (err) {
    console.error('orderController.createOrder error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to create order'
    });
  }
};

exports.getOrders = async (req, res) => {
  try {
    const orders = await orderService.getOrders(req.query);
    res.json({
      success: true,
      data: orders
    });
  } catch (err) {
    console.error('orderController.getOrders error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders'
    });
  }
};

exports.getPatientOrders = async (req, res) => {
  try {
    const orders = await orderService.getOrdersByPatient(req.params.patientId);
    res.json({
      success: true,
      data: orders
    });
  } catch (err) {
    console.error('orderController.getPatientOrders error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch patient orders'
    });
  }
};
