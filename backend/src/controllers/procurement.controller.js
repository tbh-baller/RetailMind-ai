import * as procurementService from "../services/procurement.service.js";
import * as suppliersService from "../services/suppliers.service.js";

export async function getRecommendations(req, res) {
  const recommendations = await procurementService.getProcurementRecommendations();
  res.json({ data: recommendations });
}

export async function getProcurementOrders(req, res) {
  const { limit = 100, productId } = req.query;

  let orders;
  if (productId) {
    // Get orders for specific product
    orders = await suppliersService.getProcurementOrdersByProduct(productId, parseInt(limit));
  } else {
    // Get all orders
    orders = await suppliersService.getProcurementOrders(parseInt(limit));
  }

  res.json({ data: orders });
}

export async function getProcurementOrderById(req, res) {
  const { id } = req.params;

  const order = await suppliersService.getProcurementOrderById(id);

  if (!order) {
    return res.status(404).json({ error: "Procurement order not found" });
  }

  res.json({ data: order });
}

export async function createProcurementOrder(req, res) {
  const { productId, supplierId, quantity, aiReasoning } = req.body;

  // Input validation
  if (!productId || !supplierId || !quantity) {
    return res.status(400).json({ 
      error: "Product ID, supplier ID, and quantity are required" 
    });
  }

  if (quantity <= 0 || !Number.isInteger(quantity)) {
    return res.status(400).json({ 
      error: "Quantity must be a positive integer" 
    });
  }

  try {
    // Get supplier product pricing for validation and calculation
    const suppliers = await suppliersService.getProductSuppliers(productId);
    const supplierProduct = suppliers.find(s => s.supplierId === supplierId);

    if (!supplierProduct) {
      return res.status(404).json({ 
        error: "Supplier pricing for this product not found" 
      });
    }

    // Calculate order details
    const unitPrice = supplierProduct.unitPrice;
    const totalCost = quantity * unitPrice;
    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(estimatedDelivery.getDate() + Math.ceil(supplierProduct.leadTimeDays));

    // Create the procurement order with validation
    const order = await suppliersService.createProcurementOrder({
      productId,
      supplierId,
      quantity,
      unitPrice,
      totalCost,
      estimatedDelivery: estimatedDelivery.toISOString().split('T')[0],
      status: 'Pending',
      aiReasoning: aiReasoning || null,
    });

    res.status(201).json({ data: order });
  } catch (error) {
    console.error("Error creating procurement order:", error);
    
    // Handle specific validation errors
    if (error.message.includes("Product not found")) {
      return res.status(404).json({ error: "Product not found" });
    }
    if (error.message.includes("Invalid or inactive supplier")) {
      return res.status(404).json({ error: "Supplier not found or is inactive" });
    }
    if (error.message.includes("Supplier product pricing not found")) {
      return res.status(404).json({ error: "Supplier does not sell this product" });
    }
    if (error.message.includes("below minimum order quantity")) {
      return res.status(400).json({ error: error.message });
    }
    if (error.message.includes("Insufficient supplier stock")) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: "Failed to create procurement order" });
  }
}

export async function updateProcurementOrderStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: "Status is required" });
  }

  try {
    const order = await suppliersService.updateProcurementOrderStatus(id, status);
    res.json({ data: order });
  } catch (error) {
    console.error("Error updating procurement order:", error);
    
    if (error.message.includes("Invalid status")) {
      return res.status(400).json({ error: error.message });
    }
    if (error.message.includes("not found")) {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ error: "Failed to update procurement order" });
  }
}
