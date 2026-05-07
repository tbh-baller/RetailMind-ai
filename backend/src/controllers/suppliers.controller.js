import * as suppliersService from "../services/suppliers.service.js";

export async function getSuppliers(req, res) {
  const suppliers = await suppliersService.getAllSuppliers();
  res.json({ data: suppliers });
}

export async function getSupplier(req, res) {
  const { id } = req.params;
  const supplier = await suppliersService.getSupplierById(id);

  if (!supplier) {
    return res.status(404).json({ error: "Supplier not found" });
  }

  res.json({ data: supplier });
}

export async function createSupplier(req, res) {
  const { name, type, contact, rating } = req.body;

  if (!name || !type) {
    return res.status(400).json({ error: "Name and type are required" });
  }

  const supplier = await suppliersService.createSupplier({
    name,
    type,
    contact,
    rating,
  });

  res.status(201).json({ data: supplier });
}

export async function updateSupplier(req, res) {
  const { id } = req.params;
  const { name, type, contact, rating } = req.body;

  const supplier = await suppliersService.updateSupplier(id, {
    name,
    type,
    contact,
    rating,
  });

  if (!supplier) {
    return res.status(404).json({ error: "Supplier not found" });
  }

  res.json({ data: supplier });
}

export async function deleteSupplier(req, res) {
  const { id } = req.params;
  const deleted = await suppliersService.deleteSupplier(id);

  if (!deleted) {
    return res.status(404).json({ error: "Supplier not found" });
  }

  res.json({ message: "Supplier deleted" });
}

export async function getSupplierProducts(req, res) {
  const { id } = req.params;
  const products = await suppliersService.getSupplierProducts(id);
  res.json({ data: products });
}

export async function addSupplierProduct(req, res) {
  const { supplierId, productId } = req.params;
  const { unitPrice, leadTimeDays, reliabilityScore, stockQty, minimumOrderQty } = req.body;

  if (!unitPrice || unitPrice < 0) {
    return res.status(400).json({ error: "Valid unit price is required" });
  }

  const product = await suppliersService.addSupplierProduct(supplierId, productId, {
    unitPrice,
    leadTimeDays,
    reliabilityScore,
    stockQty,
    minimumOrderQty,
  });

  res.status(201).json({ data: product });
}

export async function removeSupplierProduct(req, res) {
  const { supplierId, productId } = req.params;
  const removed = await suppliersService.removeSupplierProduct(supplierId, productId);

  if (!removed) {
    return res.status(404).json({ error: "Supplier product not found" });
  }

  res.json({ message: "Product removed from supplier" });
}

export async function getProductSuppliers(req, res) {
  const { productId } = req.params;
  const suppliers = await suppliersService.getProductSuppliers(productId);
  res.json({ data: suppliers });
}
