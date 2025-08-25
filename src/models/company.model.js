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
  password: { type: String, select: false },
  isRegistered: { type: Boolean, default: false },
  company: { type: Schema.Types.ObjectId, ref: 'companies' }
});

const companySchema = new Schema({
  companyId: String,
  name: String,
  employees: [{ type: Schema.Types.ObjectId, ref: 'employees' }],
  tasks: [taskSchema],
  createdAt: { type: Date, default: Date.now }
});

export const CompaniesModel = mongoose.model('companies', companySchema);
export const EmployeesModel = mongoose.model('employees', employeeSchema);
export const TasksModel = mongoose.model('tasks', taskSchema);
