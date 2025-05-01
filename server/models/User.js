const mongoose = require('mongoose');  // ✅ keep only once

const UserSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String
});

module.exports = mongoose.model('User', UserSchema);
