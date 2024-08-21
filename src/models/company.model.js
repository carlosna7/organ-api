import mongoose from 'mongoose';
const { Schema } = mongoose;

const taskSchema = new Schema({
  taskId: Number,
  taskName: String,
  description: String,
  responsibles: [
    {
      leadershipLevel: Number,
      employee: { type: Schema.Types.ObjectId, ref: 'employees' }
    }
  ],
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date, default: Date.now },
  status: String
});

const employeeSchema = new Schema({
  employeeId: Number,
  name: String,
  position: String,
  email: String,
  password: String,
  token: String
});

const allEmailsSchema = new Schema({
  email: String,
  company: String,
  isRegistered: { type: Boolean, default: false }
});

const companySchema = new Schema({
  companyId: String,
  name: String,
  employees: [employeeSchema],
  tasks: [taskSchema],
  createdAt: { type: Date, default: Date.now }
});

export const CompaniesModel = mongoose.model('companies', companySchema);
export const EmployeesModel = mongoose.model('employees', allEmailsSchema);
