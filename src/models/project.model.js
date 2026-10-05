import mongoose from 'mongoose';
const { Schema } = mongoose;

const projectSchema = new Schema({
  company: { type: Schema.Types.ObjectId, ref: 'companies', required: true },
  projectId: { type: Number, required: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: null },
  // Equipe responsável (opcional)
  team: { type: Schema.Types.ObjectId, ref: 'teams', default: null },
  createdAt: { type: Date, default: Date.now },
});

// projectId é único dentro de cada empresa
projectSchema.index({ company: 1, projectId: 1 }, { unique: true });
// Nome único dentro da empresa, ignorando maiúsculas (mesma collation da busca por nome)
projectSchema.index({ company: 1, name: 1 }, { unique: true, collation: { locale: 'pt', strength: 2 } });

export const ProjectsModel = mongoose.model('projects', projectSchema);
