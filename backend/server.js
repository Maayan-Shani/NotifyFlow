const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();
const MessageStats = require("./models/MessageStats");
const Message = require("./models/Message");
const User = require("./models/User");
const bcrypt = require("bcryptjs");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    await seedDemoMessages();
  })
  .catch(() => {});

const demoMessages = [
  {
    id: "msg_1",
    projectId: "project_123",
    title: "Demo Promotion",
    body: "This is a demo promotion notification",
    type: "POPUP",
    category: "PROMOTION",
    screenName: "home_screen",
    active: true,
    countries: ["IL"],
    minAndroidVersion: 28,
    maxAndroidVersion: 36,
    maxViewsPerUser: 3,
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    variants: [
      {
        id: "var_a",
        name: "A",
        title: "20% Discount",
        body: "Special promotion for users in Israel",
        buttonText: "Buy Now"
      },
      {
        id: "var_b",
        name: "B",
        title: "Free Shipping",
        body: "Today only - free shipping",
        buttonText: "Use Benefit"
      }
    ]
  },
  {
    id: "msg_2",
    projectId: "project_123",
    title: "Feature Announcement",
    body: "This is a demo feature notification",
    type: "POPUP",
    category: "FEATURE_ANNOUNCEMENT",
    screenName: "profile_screen",
    active: true,
    countries: ["IL", "US"],
    minAndroidVersion: 28,
    maxAndroidVersion: 36,
    maxViewsPerUser: 2,
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    variants: [
      {
        id: "var_a_feature",
        name: "A",
        title: "New Feature Available",
        body: "Try our new favorites feature",
        buttonText: "Try Now"
      },
      {
        id: "var_b_feature",
        name: "B",
        title: "Save Items Faster",
        body: "A new favorites feature is now available",
        buttonText: "Explore"
      }
    ]
  },
  {
    id: "msg_3",
    projectId: "project_123",
    title: "US Only Promotion",
    body: "This message is only for US users",
    type: "POPUP",
    category: "PROMOTION",
    screenName: "home_screen",
    active: true,
    countries: ["US"],
    minAndroidVersion: 28,
    maxAndroidVersion: 36,
    maxViewsPerUser: 3,
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    variants: [
      {
        id: "var_a_us",
        name: "A",
        title: "US Special Offer",
        body: "Special deal for users in the United States",
        buttonText: "Open"
      },
      {
        id: "var_b_us",
        name: "B",
        title: "Limited US Deal",
        body: "A limited offer is available in your region",
        buttonText: "Check It"
      }
    ]
  }
];

async function seedDemoMessages() {
  try {
    const existingMessagesCount = await Message.countDocuments();

    if (existingMessagesCount > 0) {
      return;
    }

    await Message.insertMany(demoMessages);
    } catch (error) {}
}

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    message: "NotifyFlow backend is running"
  });
});

// Auth API for Admin Portal

app.post("/api/auth/register", async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({
        message: "Full name, email and password are required"
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters"
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({
        message: "User with this email already exists"
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      fullName: fullName.trim(),
      email: normalizedEmail,
      passwordHash
    });

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to register user"
    });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required"
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    res.json({
      message: "Login successful",
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to login user"
    });
  }
});

function getTodayDateString() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function buildActiveDateRangeQuery(todayDate) {
  return {
    $and: [
      {
        $or: [
          { startDate: { $exists: false } },
          { startDate: null },
          { startDate: "" },
          { startDate: { $lte: todayDate } }
        ]
      },
      {
        $or: [
          { endDate: { $exists: false } },
          { endDate: null },
          { endDate: "" },
          { endDate: { $gte: todayDate } }
        ]
      }
    ]
  };
}

app.get("/sdk/messages", async (req, res) => {
  try {
    const { apiKey, userId, country, androidVersion } = req.query;
    const numericAndroidVersion = Number(androidVersion);
    const todayDate = getTodayDateString();

    const query = {
      active: true,
      ...buildActiveDateRangeQuery(todayDate)
    };

    if (country) {
      query.countries = { $in: [country] };
    }

    if (!Number.isNaN(numericAndroidVersion)) {
      query.minAndroidVersion = { $lte: numericAndroidVersion };
      query.maxAndroidVersion = { $gte: numericAndroidVersion };
    }

    const messages = await Message.find(query).sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({
      message: "Failed to load messages"
    });
  }
});

// Admin API for Portal

app.get("/api/messages", async (req, res) => {
  try {
    const messages = await Message.find().sort({ createdAt: -1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({
      message: "Failed to load messages"
    });
  }
});

app.post("/api/messages", async (req, res) => {
  try {
    const messageData = req.body;

    const newMessage = await Message.create(messageData);

    res.status(201).json(newMessage);
  } catch (error) {
    res.status(500).json({
      message: "Failed to create message"
    });
  }
});

app.put("/api/messages/:id", async (req, res) => {
  try {
    const messageId = req.params.id;
    const updateData = req.body;

    const updatedMessage = await Message.findOneAndUpdate(
      { id: messageId },
      updateData,
      {
         returnDocument: "after",
        runValidators: true
      }
    );

    if (!updatedMessage) {
      return res.status(404).json({
        message: "Message not found"
      });
    }

    res.json(updatedMessage);
  } catch (error) {
    res.status(500).json({
      message: "Failed to update message"
    });
  }
});

app.delete("/api/messages/:id", async (req, res) => {
  try {
    const messageId = req.params.id;

    const deletedMessage = await Message.findOneAndDelete({
      id: messageId
    });

    if (!deletedMessage) {
      return res.status(404).json({
        message: "Message not found"
      });
    }

    const deletedStatsResult = await MessageStats.deleteOne({
      messageId
    });

    res.json({
      message: "Message deleted successfully",
      deletedMessage,
      deletedStatsCount: deletedStatsResult.deletedCount
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete message"
    });
  }
});

function buildStatsIncrementUpdate(eventType, country, variantId) {
  const counterField =
    eventType === "IMPRESSION" ? "impressions" : "clicks";

  const countryKey = country || "unknown";
  const variantKey = variantId || "unknown";

  return {
    $inc: {
      [counterField]: 1,
      [`byCountry.${countryKey}.${counterField}`]: 1,
      [`byVariant.${variantKey}.${counterField}`]: 1
    }
  };
}

async function updateMessageStats(eventToSave) {
  if (!eventToSave.messageId) {
    throw new Error("Cannot update stats: messageId is missing");
  }

  const updateData = buildStatsIncrementUpdate(
    eventToSave.eventType,
    eventToSave.country,
    eventToSave.variantId
  );

  await MessageStats.findOneAndUpdate(
    {
      messageId: eventToSave.messageId
    },
    updateData,
    {
      upsert: true,
      returnDocument: "after",
      setDefaultsOnInsert: true
    }
  );
}

app.post("/sdk/events/impression", async (req, res) => {
  try {
    const event = req.body;

    const eventToSave = {
      messageId: event.messageId,
      variantId: event.variantId,
      userId: event.userId,
      country: event.country,
      eventType: "IMPRESSION"
    };

  await updateMessageStats(eventToSave);

  res.status(201).json({
    message: "Impression stats updated"
  });
    
  } catch (error) {
    res.status(500).json({
      message: "Failed to update impression stats"
    });
  }
});

app.post("/sdk/events/click", async (req, res) => {
  try {
    const event = req.body;

    const eventToSave = {
      messageId: event.messageId,
      variantId: event.variantId,
      userId: event.userId,
      country: event.country,
      eventType: "CLICK"
    };


    await updateMessageStats(eventToSave);

    res.status(201).json({
      message: "Click stats updated"
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update click stats"
    });
  }
});

function calculateCtr(clicks, impressions) {
  if (impressions === 0) {
    return 0;
  }

  return Number(((clicks / impressions) * 100).toFixed(2));
}

function addCtrToGroupedStats(groupedStats = {}) {
  const result = {};

  Object.keys(groupedStats).forEach((key) => {
    const impressions = groupedStats[key].impressions || 0;
    const clicks = groupedStats[key].clicks || 0;

    result[key] = {
      impressions,
      clicks,
      ctr: calculateCtr(clicks, impressions)
    };
  });

  return result;
}

function getBestCtrVariant(byVariant = {}) {
  let bestCtrVariant = null;
  let bestCtr = -1;
  let bestClicks = -1;

  Object.keys(byVariant).forEach((variantId) => {
    const variantStats = byVariant[variantId];

    const ctr = Number(variantStats.ctr) || 0;
    const clicks = Number(variantStats.clicks) || 0;

    if (ctr > bestCtr || (ctr === bestCtr && clicks > bestClicks)) {
      bestCtr = ctr;
      bestClicks = clicks;
      bestCtrVariant = variantId;
    }
  });

  return bestCtrVariant;
}

function getMostClickedVariant(byVariant = {}) {
  let mostClickedVariant = null;
  let bestClicks = -1;
  let bestCtr = -1;

  Object.keys(byVariant).forEach((variantId) => {
    const variantStats = byVariant[variantId];

    const clicks = Number(variantStats.clicks) || 0;
    const ctr = Number(variantStats.ctr) || 0;

    if (clicks > bestClicks || (clicks === bestClicks && ctr > bestCtr)) {
      bestClicks = clicks;
      bestCtr = ctr;
      mostClickedVariant = variantId;
    }
  });

  return mostClickedVariant;
}

// Kept for backward compatibility with the existing portal fields.
// In the new UI, this is displayed as Best CTR, not as the only winner.
function getWinningVariant(byVariant = {}) {
  return getBestCtrVariant(byVariant);
}

app.get("/api/messages/:messageId/stats", async (req, res) => {
  try {
    const messageId = req.params.messageId;

    const statsDocument = await MessageStats.findOne({ messageId });

    if (!statsDocument) {
      return res.json({
        messageId,
        impressions: 0,
        clicks: 0,
        ctr: 0,
        byCountry: {},
        byVariant: {},
        winningVariant: null,
        bestCtrVariant: null,
        mostClickedVariant: null
      });
    }

    const statsObject = statsDocument.toObject({
      flattenMaps: true
    });

    const impressions = statsObject.impressions || 0;
    const clicks = statsObject.clicks || 0;
    const ctr = calculateCtr(clicks, impressions);

    const byCountry = addCtrToGroupedStats(statsObject.byCountry || {});
    const byVariant = addCtrToGroupedStats(statsObject.byVariant || {});
    const bestCtrVariant = getBestCtrVariant(byVariant);
    const mostClickedVariant = getMostClickedVariant(byVariant);

    // Backward compatibility.
    // Existing old UI fields can still use winningVariant,
    // but the new portal will display bestCtrVariant and mostClickedVariant.
    const winningVariant = bestCtrVariant;

    res.json({
      messageId,
      impressions,
      clicks,
      ctr,
      byCountry,
      byVariant,
      winningVariant,
      bestCtrVariant,
      mostClickedVariant
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to calculate message stats"
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`NotifyFlow backend is running on port ${PORT}`);
});