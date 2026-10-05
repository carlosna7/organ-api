import mongoose from 'mongoose';
const { Schema } = mongoose;

const companySchema = new Schema({
  companyId: { type: String, required: true, unique: true },
  name: { type: String, required: true, trim: true },
  // Contadores usados para gerar employeeId, taskId, teamId e projectId sequenciais
  counters: {
    employee: { type: Number, default: 0 },
    task: { type: Number, default: 0 },
    team: { type: Number, default: 0 },
    project: { type: Number, default: 0 },
  },
  createdAt: { type: Date, default: Date.now },
});

// Nome único na plataforma, ignorando maiúsculas (mesma collation da busca por nome)
companySchema.index({ name: 1 }, { unique: true, collation: { locale: 'pt', strength: 2 } });

export const CompaniesModel = mongoose.model('companies', companySchema);
