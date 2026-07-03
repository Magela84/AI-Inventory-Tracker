// Request body validation for product writes.
//
// Dependency-free: returns a list of human-readable errors, and an Express
// middleware that responds 400 when validation fails.

// Numeric fields that, when present, must be finite numbers >= 0.
const NUMERIC_FIELDS = ['quantity', 'reorderThreshold', 'unitPrice'];

// Validate a product payload. `requireName` enforces name presence (for creates).
export function validateProduct(body, { requireName = true } = {}) {
  const errors = [];

  if (body == null || typeof body !== 'object' || Array.isArray(body)) {
    return ['Request body must be a JSON object'];
  }

  const hasName = typeof body.name === 'string' && body.name.trim().length > 0;
  if (requireName && !hasName) {
    errors.push('name is required and must be a non-empty string');
  } else if ('name' in body && !hasName) {
    errors.push('name must be a non-empty string');
  }

  if ('category' in body && typeof body.category !== 'string') {
    errors.push('category must be a string');
  }

  for (const field of NUMERIC_FIELDS) {
    if (field in body) {
      const value = body[field];
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
        errors.push(`${field} must be a number >= 0`);
      }
    }
  }

  return errors;
}

// Express middleware factory. Use { requireName: false } for partial updates.
export function validateProductBody(options = {}) {
  return (req, res, next) => {
    const errors = validateProduct(req.body, options);
    if (errors.length > 0) {
      return res.status(400).json({
        error: { status: 400, message: 'Validation failed', details: errors },
      });
    }
    next();
  };
}

// Validate a supplier payload.
export function validateSupplier(body, { requireName = true } = {}) {
  const errors = [];
  if (body == null || typeof body !== 'object' || Array.isArray(body)) {
    return ['Request body must be a JSON object'];
  }
  const hasName = typeof body.name === 'string' && body.name.trim().length > 0;
  if (requireName && !hasName) {
    errors.push('name is required and must be a non-empty string');
  } else if ('name' in body && !hasName) {
    errors.push('name must be a non-empty string');
  }
  if ('email' in body && typeof body.email !== 'string') {
    errors.push('email must be a string');
  }
  if ('leadTimeDays' in body) {
    const v = body.leadTimeDays;
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) {
      errors.push('leadTimeDays must be a number >= 0');
    }
  }
  return errors;
}

export function validateSupplierBody(options = {}) {
  return (req, res, next) => {
    const errors = validateSupplier(req.body, options);
    if (errors.length > 0) {
      return res
        .status(400)
        .json({ error: { status: 400, message: 'Validation failed', details: errors } });
    }
    next();
  };
}

// Validate a purchase-order create payload.
export function validatePurchaseOrder(body) {
  const errors = [];
  if (body == null || typeof body !== 'object' || Array.isArray(body)) {
    return ['Request body must be a JSON object'];
  }
  if (typeof body.supplierId !== 'string' || body.supplierId.trim().length === 0) {
    errors.push('supplierId is required');
  }
  if (!Array.isArray(body.items) || body.items.length === 0) {
    errors.push('items must be a non-empty array');
  } else {
    body.items.forEach((item, i) => {
      if (!item || typeof item.productId !== 'string' || item.productId.trim().length === 0) {
        errors.push(`items[${i}].productId is required`);
      }
      if (typeof item.quantity !== 'number' || !Number.isFinite(item.quantity) || item.quantity <= 0) {
        errors.push(`items[${i}].quantity must be a number > 0`);
      }
    });
  }
  return errors;
}

export function validatePurchaseOrderBody() {
  return (req, res, next) => {
    const errors = validatePurchaseOrder(req.body);
    if (errors.length > 0) {
      return res
        .status(400)
        .json({ error: { status: 400, message: 'Validation failed', details: errors } });
    }
    next();
  };
}

export default {
  validateProduct,
  validateProductBody,
  validateSupplier,
  validateSupplierBody,
  validatePurchaseOrder,
  validatePurchaseOrderBody,
};
