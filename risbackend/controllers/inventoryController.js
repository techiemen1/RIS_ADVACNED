const Inventory = require('../models/inventoryModel');
const { logAction } = require('./auditController');

exports.addItem = async (req,res) => {
  try {
    const created_by = req.user.username;
    const item = await Inventory.addItem({ ...req.body, created_by });
    await logAction(created_by, req.user.role, `Added inventory item ID ${item.id}`);
    res.json(item);
  } catch(err){
    console.error('Add inventory error:',err);
    res.status(500).json({ error:'Failed to add item'});
  }
};

exports.getItems = async (req,res) => {
  try{
    const items = await Inventory.getItems();
    res.json(items);
  }catch(err){
    console.error('Fetch inventory error:',err);
    res.status(500).json({ error:'Failed to fetch items'});
  }
};

exports.updateItem = async (req,res)=>{
  try{
    const {id} = req.params;
    const item = await Inventory.updateItem(id, req.body);
    await logAction(req.user.username, req.user.role, `Updated inventory item ID ${id}`);
    res.json(item);
  }catch(err){
    console.error('Update inventory error:',err);
    res.status(500).json({ error:'Failed to update item'});
  }
};

exports.deleteItem = async (req,res)=>{
  try{
    const {id} = req.params;
    const item = await Inventory.deleteItem(id);
    await logAction(req.user.username, req.user.role, `Deleted inventory item ID ${id}`);
    res.json({ success:true, item });
  }catch(err){
    console.error('Delete inventory error:',err);
    res.status(500).json({ error:'Failed to delete item'});
  }
};
