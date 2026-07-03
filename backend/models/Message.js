const mongoose = require("mongoose");

const messageVariantSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    title: {
      type: String,
      required: true
    },
    body: {
      type: String,
      required: true
    },
    buttonText: {
      type: String,
      required: true
    }
  },
  {
    _id: false
  }
);

const messageSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true
    },
    projectId: {
      type: String,
      required: true
    },
    title: {
      type: String,
      required: true
    },
    body: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ["POPUP", "BANNER"],
      default: "POPUP"
    },
    category: {
      type: String,
      enum: ["PROMOTION", "FEATURE_ANNOUNCEMENT"],
      required: true
    },
    screenName: {
      type: String,
      required: true
    },
    active: {
      type: Boolean,
      default: true
    },
    countries: {
      type: [String],
      default: []
    },
    minAndroidVersion: {
      type: Number,
      default: 28
    },
    maxAndroidVersion: {
      type: Number,
      default: 36
    },
    maxViewsPerUser: {
      type: Number,
      default: 3
    },
    startDate: {
      type: String,
      default: null
    },
    endDate: {
      type: String,
      default: null
    },
    variants: {
      type: [messageVariantSchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Message", messageSchema);