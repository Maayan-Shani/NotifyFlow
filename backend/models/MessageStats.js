const mongoose = require("mongoose");

const counterSchema = new mongoose.Schema(
  {
    impressions: {
      type: Number,
      default: 0
    },
    clicks: {
      type: Number,
      default: 0
    }
  },
  {
    _id: false
  }
);

const messageStatsSchema = new mongoose.Schema(
  {
    messageId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

    impressions: {
      type: Number,
      default: 0
    },

    clicks: {
      type: Number,
      default: 0
    },

    byCountry: {
      type: Map,
      of: counterSchema,
      default: {}
    },

    byVariant: {
      type: Map,
      of: counterSchema,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("MessageStats", messageStatsSchema);