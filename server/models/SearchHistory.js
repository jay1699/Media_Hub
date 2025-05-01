const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  username: String,
  term: String,
  timestamp: { type: Date, default: Date.now }
});
module.exports = mongoose.model('SearchHistory', schema);// Mongoose SearchHistory schema