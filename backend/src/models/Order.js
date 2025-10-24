const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  ertibType: { type: String, enum: ['normal', 'special'], required: true },
  ketchup: { type: Boolean, default: true },    // default included
  spices: { type: Boolean, default: true },     // default included
  extraKetchup: { type: Boolean, default: false },
  extraFelafil: { type: Boolean, default: false },
  quantity: { type: Number, default: 1 },
  unitPrice: { type: Number, required: true }, // price per single item with extras
  lineTotal: { type: Number, required: true } // unitPrice * quantity
});

const smsHistorySchema = new mongoose.Schema({
  type: { type: String }, // 'confirmation' | 'arrival'
  providerResponse: { type: Object },
  status: { type: String }, // 'sent' | 'failed' | 'pending'
  createdAt: { type: Date, default: Date.now }
});

const orderSchema = new mongoose.Schema({
  customerName: { type: String, required: true },
  phone: { type: String, required: true },
  location: { type: String, required: true },
  source: { type: String, enum: ['online', 'phone'], default: 'online' },
  items: [itemSchema],
  total: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'arrived', 'delivered', 'canceled', 'no_show'],
    default: 'pending'
  },
  smsHistory: [smsHistorySchema],
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
