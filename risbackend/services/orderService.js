const orderModel = require('../models/orderModel');

exports.createOrder = async (data) => {
  return await orderModel.createOrder(data);
};

exports.getOrders = async (filters = {}) => {
  return await orderModel.getOrders(filters);
};

exports.getOrdersByPatient = async (patientId) => {
  return await orderModel.getOrders({ patient_id: patientId });
};
