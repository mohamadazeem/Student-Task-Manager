const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: 200,
    },
    description: {
      type: String,
      default: "",
    },
    deadline: {
      type: Date,
      default: null,
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Completed"],
      default: "Pending",
    },
  },
  { timestamps: true, toJSON: { transform(doc, ret) {
    ret.id = String(ret._id);
    ret.user_id = String(ret.userId);
    ret.created_at = ret.createdAt;
    ret.updated_at = ret.updatedAt;
    for (const key of ["_id", "__v", "userId", "createdAt", "updatedAt"]) delete ret[key];
    return ret;
  } } }
);

module.exports = mongoose.model("Task", taskSchema);