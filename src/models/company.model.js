import mongoose from 'mongoose';
const { Schema } = mongoose;

const companySchema = new Schema({
  companyId: { type: String, required: true, unique: true },
  name: { type: String, required: true, trim: true },
  // Contadores usados para gerar employeeId e taskId sequenciais
  counters: {
    employee: { type: Number, default: 0 },
    task: { type: Number, default: 0 },
  },
  createdAt: { type: Date, default: Date.now },
});

export const CompaniesModel = mongoose.model('companies', companySchema);
