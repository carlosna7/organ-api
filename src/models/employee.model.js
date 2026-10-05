import mongoose from 'mongoose';
const { Schema } = mongoose;

const employeeSchema = new Schema({
  employeeId: { type: Number, required: true },
  name: { type: String, trim: true, default: null },
  position: { type: String, trim: true, default: null },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, select: false },
  role: { type: String, enum: ['leader', 'member'], default: 'member' },
  isRegistered: { type: Boolean, default: false },
  company: { type: Schema.Types.ObjectId, ref: 'companies', required: true },
});

// employeeId é único dentro de cada empresa
employeeSchema.index({ company: 1, employeeId: 1 }, { unique: true });

export const EmployeesModel = mongoose.model('employees', employeeSchema);
