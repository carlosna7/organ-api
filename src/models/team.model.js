import mongoose from 'mongoose';
const { Schema } = mongoose;

const teamSchema = new Schema({
  company: { type: Schema.Types.ObjectId, ref: 'companies', required: true },
  teamId: { type: Number, required: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: null },
  members: [{ type: Schema.Types.ObjectId, ref: 'employees' }],
  createdAt: { type: Date, default: Date.now },
});

// teamId é único dentro de cada empresa
teamSchema.index({ company: 1, teamId: 1 }, { unique: true });
// Nome único dentro da empresa, ignorando maiúsculas (mesma collation da busca por nome)
teamSchema.index({ company: 1, name: 1 }, { unique: true, collation: { locale: 'pt', strength: 2 } });

export const TeamsModel = mongoose.model('teams', teamSchema);
