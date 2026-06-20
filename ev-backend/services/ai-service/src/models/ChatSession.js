import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true
    },
    content: {
      type: String,
      required: true,
      trim: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const chatSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true
    },
    sessionId: {
      type: String,
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    messages: {
      type: [chatMessageSchema],
      default: []
    }
  },
  {
    collection: "chat_sessions",
    timestamps: true,
    versionKey: false
  }
);

chatSessionSchema.index({ userId: 1, sessionId: 1 }, { unique: true });
chatSessionSchema.index({ userId: 1, updatedAt: -1 });

const ChatSession = mongoose.model("ChatSession", chatSessionSchema);

export default ChatSession;
